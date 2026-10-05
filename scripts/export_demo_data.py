"""Exporta JSON agregado/anonimizado para o demo GitHub Pages.

Uso:
  python scripts/export_demo_data.py
  python scripts/export_demo_data.py --ano 2026 --mes 8

Nao exporta nomes de pessoas, CPF, matricula nem linhas de folha.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime
from pathlib import Path

import duckdb
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(__file__).resolve().parents[2] / "tcmgo_ipasgo"
if not SRC.exists():
    SRC = ROOT.parent / "tcmgo_ipasgo"
DB = SRC / "scripts" / "servidores" / "tcmgo_cruzamento.duckdb"
OUT = ROOT / "data" / "municipios.json"
sys.path.insert(0, str(SRC / "painel_convenios"))

from agrupamentos_data import (  # noqa: E402
    convenios_do_municipio,
    load_mapa_agrupamentos,
    perfil_folha_municipio,
)


def _round_money(x) -> float | None:
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if v != v:
        return None
    return float(int(round(v / 50.0) * 50))


def _pct(x) -> float | None:
    if x is None or (isinstance(x, float) and x != x):
        return None
    try:
        return round(float(x), 1)
    except (TypeError, ValueError):
        return None


def _safe_int(x) -> int:
    try:
        if x is None or (isinstance(x, float) and x != x):
            return 0
        return int(x)
    except (TypeError, ValueError):
        return 0


def _perfil(df: pd.DataFrame) -> list[dict]:
    if df is None or df.empty:
        return []
    rows = []
    for _, r in df.iterrows():
        rows.append(
            {
                "categoria": str(r.get("categoria") or "-")[:80],
                "n": _safe_int(r.get("n_pessoas")),
                "pct": _pct(r.get("pct")) or 0.0,
            }
        )
    return rows


def _convenios(mun: str) -> list[dict]:
    try:
        df = convenios_do_municipio(mun, somente_vigentes=True)
    except Exception:
        return []
    if df is None or df.empty:
        return []
    out = []
    for _, c in df.iterrows():
        out.append(
            {
                "tipo": str(c.get("tipo_convenio") or "-"),
                "inicio": str(c.get("inicio_vigencia") or "-"),
            }
        )
    return out


def _pick_competencia(con: duckdb.DuckDBPyConnection, ano: int | None, mes: int | None):
    if ano is not None and mes is not None:
        n = con.execute(
            "SELECT count(*) FROM servidores_folha WHERE ano = ? AND mes = ?",
            [ano, mes],
        ).fetchone()[0]
        if not n:
            raise SystemExit(f"Sem folha para {mes:02d}/{ano}")
        return int(ano), int(mes)
    row = con.execute(
        """
        SELECT ano, mes, count(*) AS n
        FROM servidores_folha
        GROUP BY 1, 2
        HAVING count(*) >= 50000
        ORDER BY ano DESC, mes DESC
        LIMIT 1
        """
    ).fetchone()
    if row:
        return int(row[0]), int(row[1])
    row = con.execute(
        """
        SELECT ano, mes
        FROM servidores_folha
        GROUP BY 1, 2
        ORDER BY count(*) DESC, ano DESC, mes DESC
        LIMIT 1
        """
    ).fetchone()
    return int(row[0]), int(row[1])


def main() -> None:
    ap = argparse.ArgumentParser(description="Atualiza data/municipios.json do demo Pages")
    ap.add_argument("--ano", type=int, default=None)
    ap.add_argument("--mes", type=int, default=None)
    ap.add_argument("--db", type=Path, default=None, help="Caminho do tcmgo_cruzamento.duckdb")
    args = ap.parse_args()

    db = Path(args.db) if args.db else DB
    if not db.exists():
        raise SystemExit(f"DuckDB nao encontrado: {db}")

    con = duckdb.connect(str(db), read_only=True)
    ano, mes = _pick_competencia(con, args.ano, args.mes)

    df, ok, msg = load_mapa_agrupamentos(con, int(ano), int(mes))
    if df is None or df.empty:
        raise SystemExit(f"Sem dados do mapa: ok={ok} msg={msg}")

    municipios = []
    for _, r in df.iterrows():
        mun = str(r.get("municipio") or "").strip()
        if not mun:
            continue
        codigo = str(r.get("codigo_ibge") or "").strip()
        n_pref = _safe_int(r.get("n_servidores_pref"))
        n_cam = _safe_int(r.get("n_servidores_camara"))
        if n_pref + n_cam > 0:
            dv, ds = perfil_folha_municipio(con, int(ano), int(mes), mun)
            perfil_v = _perfil(dv)
            perfil_s = _perfil(ds)
        else:
            perfil_v, perfil_s = [], []

        municipios.append(
            {
                "municipio": mun,
                "codigo_ibge": codigo,
                "n_servidores_pref": n_pref,
                "n_servidores_camara": n_cam,
                "n_benef_pref": _safe_int(r.get("n_benef_pref")),
                "n_benef_camara": _safe_int(r.get("n_benef_camara")),
                "n_titulares_municipais": _safe_int(r.get("n_titulares_municipais")),
                "remun_media_pref": _round_money(r.get("remun_media_pref")),
                "remun_media_camara": _round_money(r.get("remun_media_camara")),
                "cobertura_camara_pct": _pct(r.get("cobertura_camara_pct")),
                "cobertura_pref_pct": _pct(r.get("cobertura_pref_pct")),
                "perfil_vinculo": perfil_v,
                "perfil_situacao": perfil_s,
                "convenios": _convenios(mun),
            }
        )

    tcmgo_pref = sum(m["n_servidores_pref"] for m in municipios)
    tcmgo_cam = sum(m["n_servidores_camara"] for m in municipios)
    ipasgo_pref = sum(m["n_benef_pref"] for m in municipios)
    ipasgo_cam = sum(m["n_benef_camara"] for m in municipios)
    pct_sem_cam = (
        round(100.0 * max(0, tcmgo_cam - ipasgo_cam) / tcmgo_cam, 1)
        if tcmgo_cam > 0
        else None
    )

    payload = {
        "titulo": "Painel Convenios — demo publica",
        "org": "IPASGO",
        "aviso": (
            "Versao compactada e anonimizada para demonstracao. "
            "Contem apenas agregados por municipio (sem nomes, CPF, matricula "
            "ou linhas individuais de folha). Remuneracoes medias arredondadas."
        ),
        "competencia": {"ano": int(ano), "mes": int(mes)},
        "gerado_em": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "fonte": "TCMGO x beneficiarios_ipasgo (agregado local)",
        "kpis": {
            "n_municipios": len({m["municipio"] for m in municipios if m["municipio"]}),
            "tcmgo_pref": tcmgo_pref,
            "tcmgo_camara": tcmgo_cam,
            "ipasgo_pref": ipasgo_pref,
            "ipasgo_camara": ipasgo_cam,
            "pct_sem_ipasgo_camara": pct_sem_cam,
        },
        "municipios": sorted(municipios, key=lambda m: m["municipio"]),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    size_kb = OUT.stat().st_size / 1024
    print(
        f"OK -> {OUT} ({size_kb:.1f} KB) | competencia {mes:02d}/{ano} | "
        f"{len(municipios)} mun."
    )
    con.close()


if __name__ == "__main__":
    main()
