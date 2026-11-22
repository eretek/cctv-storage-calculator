/*! Eretek Online Araçlar #75 — CCTV Disk ve Saklama Süresi */
ERT.def('75', {
	run: function (v, c) {
		var groups = c.lines(v.groups, 200, 'groups').map(function (l, i) {
			var p = l.split(/[;\t]/).map(function (x) { return x.trim(); }), n = p.slice(1).map(function (x) { return ERT.parseNum(x, 'en'); });
			if (p.length < 5 || !(n[0] > 0) || Math.floor(n[0]) !== n[0] || !(n[1] > 0) || !(n[2] > 0 && n[2] <= 24) || !(n[3] > 0)) { throw c.fe('groups', 'rowFmt', { r: i + 1 }); }
			return { label: p[0] || '#' + (i + 1), cams: n[0], mbps: n[1], hours: n[2], days: n[3] };
		});
		var r = ERT.cap.storage({ groups: groups, overhead: v.oh, usable: v.usable ? v.usable * 1e12 : null });
		var rows = r.rows.map(function (g) { return [g.label, g.cams, c.n(g.mbps, 2), g.hours, g.days, c.bytes(g.perDay), c.bytes(g.bytes)]; });
		var msgs = [];
		if (v.usable) { msgs.push(r.fits ? ['ok', c.t('fits', { f: c.bytes(r.free) })] : ['err', c.t('nofit', { f: c.bytes(-r.free), d: r.daysPossible })]); }
		var cams = groups.reduce(function (s, g) { return s + g.cams; }, 0);
		msgs.push(['info', c.t('vbr')], ['info', c.t('raid')]);
		var cols = [c.t('c_g'), c.t('c_c'), 'Mbit/s', c.t('c_h'), c.t('c_d'), c.t('c_pd'), c.t('c_t')];
		var kv = [[c.t('cams'), cams], [c.t('ingest'), c.n(groups.reduce(function (s, g) { return s + g.cams * g.mbps; }, 0), 1) + ' Mbit/s'], [c.t('daily'), c.bytes(r.dailyOh)], [c.t('raw'), c.bytes(r.raw)], [c.t('total', { p: v.oh || 0 }), c.bytes(r.total)]];
		if (v.usable) { kv.push([c.t('usable'), c.bytes(r.usable)], [c.t('daysPos'), r.daysPossible + ' ' + c.t('days')]); }
		return { big: c.bytes(r.total), kv: kv, msgs: msgs, tables: [{ cols: cols, rows: rows }], x: { csv: { name: 'cctv-storage', cols: cols, rows: rows } }, v: { totalTB: Math.round(r.total / 1e9) / 1000, rawTB: Math.round(r.raw / 1e9) / 1000, fits: v.usable ? r.fits : null, daysPossible: v.usable ? r.daysPossible : null } };
	}
});
