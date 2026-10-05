/* Demo GitHub Pages — mapa Pref./Câmara × IPASGO (agregado anonimizado) */
(function () {
  const DATA_URL = "data/municipios.json";
  const GEO_URL = "data/go_municipios.geojson";

  const fmtInt = (n) =>
    n == null || Number.isNaN(n)
      ? "—"
      : Math.round(Number(n)).toLocaleString("pt-BR");
  const fmtPct = (n) =>
    n == null || Number.isNaN(Number(n))
      ? "—"
      : `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const fmtBrl = (n) =>
    n == null || Number.isNaN(Number(n))
      ? "—"
      : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  function colorCob(v) {
    if (v == null || Number.isNaN(v)) return "#d8d3c8";
    if (v < 10) return "#e8a05c";
    if (v < 25) return "#c5d96a";
    if (v < 50) return "#5aaa6e";
    return "#007940";
  }

  function metric(k, v) {
    return `<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  }

  function bars(rows, alt) {
    if (!rows || !rows.length) return `<p class="muted">Sem dados.</p>`;
    return rows
      .slice(0, 8)
      .map((r) => {
        const pct = Math.max(0, Math.min(100, Number(r.pct) || 0));
        return `<div class="bar-row">
          <span title="${r.categoria}">${escapeHtml(truncate(r.categoria, 28))}</span>
          <div class="bar-track"><div class="bar-fill ${alt ? "alt" : ""}" style="width:${pct}%"></div></div>
          <span>${fmtPct(r.pct)}</span>
        </div>`;
      })
      .join("");
  }

  function truncate(s, n) {
    s = String(s || "");
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderKpis(k, comp) {
    const el = document.getElementById("kpis");
    el.innerHTML = [
      ["Municípios", fmtInt(k.n_municipios)],
      ["Pref. / Câmara (folha)", `${fmtInt(k.tcmgo_pref)} / ${fmtInt(k.tcmgo_camara)}`],
      ["Titulares Pref. / Câmara", `${fmtInt(k.ipasgo_pref)} / ${fmtInt(k.ipasgo_camara)}`],
      ["% sem IPASGO Câmara", fmtPct(k.pct_sem_ipasgo_camara)],
    ]
      .map(([a, b]) => `<div class="kpi"><div class="k">${a}</div><div class="v">${b}</div></div>`)
      .join("");
    document.getElementById("topMeta").textContent =
      `Competência ${String(comp.mes).padStart(2, "0")}/${comp.ano}`;
    document.getElementById("legend").innerHTML =
      `<span>0%</span><div class="legend-bar"></div><span>100%</span>`;
  }

  function renderSide(m, comp) {
    const side = document.getElementById("side");
    if (!m) {
      side.innerHTML =
        '<div class="empty-side">Selecione um município no mapa<br/>para ver Pref., Câmara e cobertura.</div>';
      return;
    }
    const conv =
      m.convenios && m.convenios.length
        ? m.convenios
            .map(
              (c) =>
                `<div class="conv-row"><strong>${escapeHtml(c.tipo)}</strong><span class="muted">Início ${escapeHtml(c.inicio)}</span></div>`
            )
            .join("")
        : `<p class="muted">Sem convênio Pref./Câmara vigente na base de referência.</p>`;

    side.innerHTML = `
      <p class="mcard-name">${escapeHtml((m.municipio || "").toUpperCase())}</p>
      <p class="mcard-meta">Competência ${String(comp.mes).padStart(2, "0")}/${comp.ano} · IBGE ${escapeHtml(m.codigo_ibge || "—")}</p>
      <div class="metrics">
        ${metric("Servidores Pref.", fmtInt(m.n_servidores_pref))}
        ${metric("Servidores Câmara", fmtInt(m.n_servidores_camara))}
        ${metric("Remun. média Pref.", fmtBrl(m.remun_media_pref))}
        ${metric("Remun. média Câmara", fmtBrl(m.remun_media_camara))}
        ${metric("Titulares Pref.", fmtInt(m.n_benef_pref))}
        ${metric("Titulares Câmara", fmtInt(m.n_benef_camara))}
        ${metric("Titulares municipais", fmtInt(m.n_titulares_municipais))}
        ${metric("% IPASGO Câmara", fmtPct(m.cobertura_camara_pct))}
      </div>
      <div class="pills">
        <span class="pill">Câmara: ${fmtPct(m.cobertura_camara_pct)} com IPASGO</span>
        <span class="pill">Pref.: ${fmtPct(m.cobertura_pref_pct)} com IPASGO</span>
      </div>
      <p class="block-title">Convênios em vigência</p>
      ${conv}
      <p class="block-title">Folha — tipo de vínculo</p>
      ${bars(m.perfil_vinculo, false)}
      <p class="block-title">Folha — situação funcional</p>
      ${bars(m.perfil_situacao, true)}
    `;
  }

  async function main() {
    const [data, geo] = await Promise.all([
      fetch(DATA_URL).then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar data/municipios.json");
        return r.json();
      }),
      fetch(GEO_URL).then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar GeoJSON");
        return r.json();
      }),
    ]);

    document.getElementById("aviso").textContent = data.aviso || "";
    document.getElementById("gerado").textContent = data.gerado_em
      ? `Gerado em ${data.gerado_em.replace("T", " ")}`
      : "";
    renderKpis(data.kpis || {}, data.competencia || {});

    const byIbge = new Map(
      (data.municipios || [])
        .filter((m) => m.codigo_ibge)
        .map((m) => [String(m.codigo_ibge), m])
    );

    const map = L.map("map", { scrollWheelZoom: true, zoomControl: true }).setView(
      [-15.95, -49.58],
      7
    );
    // OpenStreetMap (sem API key; CARTO passou a exigir chave em basemaps.cartocdn.com)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    let selected = null;
    const layer = L.geoJSON(geo, {
      style(feature) {
        const code = String(feature.properties.codigo_ibge || feature.properties.id || "");
        const m = byIbge.get(code);
        const cob = m ? m.cobertura_camara_pct : null;
        return {
          fillColor: colorCob(cob),
          weight: 0.7,
          color: "#ffffff",
          fillOpacity: 0.88,
        };
      },
      onEachFeature(feature, lyr) {
        const code = String(feature.properties.codigo_ibge || feature.properties.id || "");
        const m = byIbge.get(code);
        const nome = (m && m.municipio) || feature.properties.name || code;
        const cob = m ? fmtPct(m.cobertura_camara_pct) : "—";
        lyr.bindTooltip(`<strong>${escapeHtml(nome)}</strong><br/>% IPASGO Câmara: ${cob}`, {
          sticky: true,
        });
        lyr.on("click", () => {
          if (selected) layer.resetStyle(selected);
          selected = lyr;
          lyr.setStyle({ weight: 2.2, color: "#1b4332", fillOpacity: 0.95 });
          lyr.bringToFront();
          renderSide(m || { municipio: nome, codigo_ibge: code }, data.competencia || {});
        });
      },
    }).addTo(map);

    try {
      map.fitBounds(layer.getBounds(), { padding: [12, 12] });
    } catch (_) {
      /* ignore */
    }
  }

  main().catch((err) => {
    document.getElementById("side").innerHTML =
      `<div class="empty-side">${escapeHtml(err.message || String(err))}</div>`;
    console.error(err);
  });
})();
