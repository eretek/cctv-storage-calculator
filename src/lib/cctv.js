/*! Eretek — ortak kapasite motorları: PoE (#11, #79), CCTV depolama (#75, #79), CCTV bant genişliği (#76, #79). */
(function (root) {
	'use strict';
	var ERT = root.ERT = root.ERT || {};
	/** IEEE 802.3 PSE port çıkışı ve 100 m'de PD'ye ulaşan en az güç (W). */
	var STD = { af: { pse: 15.4, pd: 12.95 }, at: { pse: 30, pd: 25.5 }, bt3: { pse: 60, pd: 51 }, bt4: { pse: 90, pd: 71.3 } };

	/**
	 * PoE bütçesi.
	 * groups: [{n, w, label}], basis: 'pse'|'pd', std: af|at|bt3|bt4|custom, portLimit (custom ise W), budget W, margin % (bütçeden ayrılacak pay)
	 * PD değeri verilirse PSE ihtiyacı = PD + (standardın PSE−PD farkı): 100 m kablo için en kötü durum kaybı (temkinli).
	 */
	function poe(o) {
		var s = STD[o.std] || null, limit = s ? s.pse : o.portLimit, loss = s ? s.pse - s.pd : 0;
		var rows = [], total = 0, ports = 0, viol = [];
		o.groups.forEach(function (g, i) {
			var per = o.basis === 'pd' ? g.w + loss : g.w;
			per = Math.round(per * 1000) / 1000;
			var sum = Math.round(per * g.n * 1000) / 1000;
			var ok = per <= limit + 1e-9;
			if (!ok) { viol.push(i); }
			rows.push({ label: g.label || ('#' + (i + 1)), n: g.n, w: g.w, per: per, sum: sum, ok: ok });
			total += sum; ports += g.n;
		});
		total = Math.round(total * 1000) / 1000;
		var usable = o.budget * (1 - (o.margin || 0) / 100);
		return { rows: rows, total: total, ports: ports, limit: limit, loss: loss, usable: usable, free: Math.round((usable - total) * 1000) / 1000, budgetOk: total <= usable + 1e-9, portOk: !viol.length, viol: viol };
	}

	/**
	 * CCTV kayıt alanı. groups: [{label, cams, mbps, hours, days}], overhead % (dosya sistemi/olay kayıt payı), usable bayt (ops.)
	 * bayt = kamera × Mbps × 1e6 / 8 × saat × 3600 × gün
	 */
	function storage(o) {
		var rows = [], raw = 0, daily = 0;
		o.groups.forEach(function (g) {
			var perDay = g.cams * g.mbps * 1e6 / 8 * g.hours * 3600;
			var tot = perDay * g.days;
			rows.push({ label: g.label, cams: g.cams, mbps: g.mbps, hours: g.hours, days: g.days, perDay: perDay, bytes: tot });
			raw += tot; daily += perDay;
		});
		var withOh = raw * (1 + (o.overhead || 0) / 100);
		var res = { rows: rows, raw: raw, total: withOh, daily: daily, dailyOh: daily * (1 + (o.overhead || 0) / 100) };
		if (o.usable) {
			res.usable = o.usable; res.fits = withOh <= o.usable; res.free = o.usable - withOh;
			// kapasitenin karşıladığı gün (tüm grupların aynı gün sayısına indirgenmiş hali)
			res.daysPossible = res.dailyOh > 0 ? Math.floor(o.usable / res.dailyOh) : Infinity;
		}
		return res;
	}

	/** Bant genişliği: ingest = Σ kamera × (ana akış [+ alt akış kaydediliyorsa]); egress = Σ istemci × akış × Mbps. */
	function bandwidth(o) {
		var ingest = 0, sub = 0, egress = 0;
		o.groups.forEach(function (g) { ingest += g.cams * g.main; sub += g.cams * (g.sub || 0); });
		if (o.recordSub) { ingest += sub; }
		(o.clients || []).forEach(function (c) { egress += c.n * c.streams * c.mbps; });
		var r = function (x) { return Math.round(x * 1e6) / 1e6; };
		return { ingest: r(ingest), sub: r(sub), egress: r(egress), total: r(ingest + egress) };
	}
	ERT.cap = { STD: STD, poe: poe, storage: storage, bandwidth: bandwidth };
}(typeof window !== 'undefined' ? window : globalThis));
