(function ($, moment) {
	// Add moment.js-based sorting to DataTables
	$.fn.dataTable.moment = function (format, locale) {
		var types = $.fn.dataTable.ext.type;

		// Add type detection
		types.detect.unshift(function (d) {
			if (d) {
				d = d.replace(/(<.*?>)|(\r?\n|\r)/g, '').trim(); // Strip HTML tags and whitespace
			}

			return d === '' || d === null
			? 'moment-' + format
			: moment(d, format, locale, true).isValid()
			? 'moment-' + format
			: null;
		});

		// Add sorting method - use an integer for sorting
		types.order['moment-' + format + '-pre'] = function (d) {
			if (d) {
				d = d.replace(/(<.*?>)|(\r?\n|\r)/g, '').trim(); // Strip HTML tags and whitespace
			}

			return d === '' || d === null
			? -Infinity
			: parseInt(moment(d, format, locale, true).format('x'), 10);
		};
	};

	// Add natural sort functionality
	function naturalSort(a, b, html) {
		var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?%?$|^0x[0-9a-f]+$|[0-9]+)/gi,
 sre = /(^[ ]*|[ ]*$)/g,
 htmre = /(<([^>]+)>)/ig,
 x = a.toString().replace(sre, ''),
 y = b.toString().replace(sre, '');

 if (!html) {
	 x = x.replace(htmre, '');
	 y = y.replace(htmre, '');
 }

 var xN = x.replace(re, '\0$1\0').split('\0'),
 yN = y.replace(re, '\0$1\0').split('\0');

 for (var i = 0, max = Math.max(xN.length, yN.length); i < max; i++) {
	 var oFxNcL = parseFloat(xN[i]) || xN[i] || 0;
	 var oFyNcL = parseFloat(yN[i]) || yN[i] || 0;

	 if (oFxNcL < oFyNcL) return -1;
	 if (oFxNcL > oFyNcL) return 1;
 }
 return 0;
	}

	// Extend DataTables sorting
	jQuery.extend(jQuery.fn.dataTableExt.oSort, {
		'natural-asc': function (a, b) {
			return naturalSort(a, b, true);
		},
		'natural-desc': function (a, b) {
			return naturalSort(a, b, true) * -1;
		},
		'natural-nohtml-asc': function (a, b) {
			return naturalSort(a, b, false);
		},
		'natural-nohtml-desc': function (a, b) {
			return naturalSort(a, b, false) * -1;
		},
	});
})(jQuery, moment);
