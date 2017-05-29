"use strict";

function doc_ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}
if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^\s*(\S*(?:\s+\S+)*)\s*$/, '$1');
    };
}
if (!String.prototype.enc) {
    String.prototype.enc = function(keep_case) {
        if (!keep_case) {
            return encodeURI(this.toLowerCase().replace(/\x20/g, '+'));
        }
        return encodeURI(this.replace(/\x20/g, '+'));
    };
}
if (!String.prototype.r47) {
    String.prototype.r47 = function() {
        var b = [],
            c, i = this.length,
            a = '!'.charCodeAt(),
            z = a + 94;
        while (i--) {
            c = this.charCodeAt(i);
            if (c >= a && c < z) {
                b[i] = String.fromCharCode(((c - a + 47) % (94)) + a);
            } else {
                b[i] = this.charAt(i);
            }
        }
        return b.join('');
    };
}
if (!String.prototype.spf) {
    String.prototype.spf = function() {
        var args = Array.prototype.slice.call(arguments, 0),
            arg;
        return this.replace(/(%[disv])/g, function(val) {
            arg = args.shift();
            if (arg !== undefined) {
                switch (val.charCodeAt(1)) {
                    case 100:
                        return +arg;
                    case 105:
                        return Math.round(+arg);
                    case 115:
                        return String(arg);
                    case 118:
                        return arg;
                }
            }
            return val;
        });
    };
}

function columnize(lst, num_of_lsts) {
    var i, j, max_items = Math.ceil(lst.children.length / num_of_lsts);
    var w = (Math.floor(1000 / num_of_lsts) / 10);
    lst.style.width = w + '%';
    for (i = 1; i < num_of_lsts; i++) {
        var nxt = lst.cloneNode();
        lst.parentElement.insertBefore(nxt, lst);
        for (j = 0; j < max_items; j++) {
            nxt.appendChild(lst.removeChild(lst.children[0]));
        }
    }
}

function element_in_view(element) {
    var coords = element.getBoundingClientRect();
    return ((coords.top >= 0 && coords.left >= 0 && coords.top) <= (window.innerHeight || document.documentElement.clientHeight));
};

function commas(num) {
    num = Math.ceil(parseFloat(num)).toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(num)) {
        num = num.replace(pattern, '$1,$2');
    }
    return num;
}
var cookie = function(key, value, options) {
    if (arguments.length > 1 && String(value) !== "[object Object]") {
        options = options || {};
        if (value === null || value === undefined) {
            options.expires = -1;
        }
        if (typeof options.expires === 'number') {
            var days = options.expires,
                t = options.expires = new Date();
            t.setDate(t.getDate() + days);
        }
        value = String(value);
        return (document.cookie = [encodeURIComponent(key), '=', options.raw ? value : encodeURIComponent(value), options.expires ? '; expires=' + options.expires.toUTCString() : '', options.path ? '; path=' + options.path : '', options.domain ? '; domain=' + options.domain : '', options.secure ? '; secure' : ''].join(''));
    }
    options = value || {};
    var result, decode = options.raw ? function(s) {
        return s;
    } : decodeURIComponent;
    return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;
};

function is_num(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function debounce(fnc, timeout) {
    var tout_id, timeout = timeout || 333;
    return function() {
        var scope = this,
            args = arguments;
        clearTimeout(tout_id);
        tout_id = setTimeout(function() {
            fnc.apply(scope, [].slice.call(args));
        }, timeout);
    };
}

function commute_calc() {
    var comm = $('.commute-container');
    var inp1 = comm.find('form input:eq(0)');
    var inp2 = comm.find('form input:eq(1)');
    var tbl = comm.children('table');
    var commutes = {
            'driving': null,
            'bicycling': null,
            'walking': null
        },
        from = '',
        to = '';
    var service = new google.maps.DistanceMatrixService();
    var request_cnt = 0,
        MAX_RQSTS = 3;
    var td = tbl.find('td');
    var completed = function() {
        td.text('');
        if (!from || !to) return false;
        inp1.val(from);
        inp2.val(to);
        if (commutes.walking) {
            $('tr:eq(2) td:eq(0)', tbl).text(commutes.walking.distance.text);
            $('tr:eq(3) td:eq(0)', tbl).text(commutes.walking.duration.text);
        }
        if (commutes.bicycling) {
            $('tr:eq(2) td:eq(1)', tbl).text(commutes.bicycling.distance.text);
            $('tr:eq(3) td:eq(1)', tbl).text(commutes.bicycling.duration.text);
        }
        if (commutes.driving) {
            $('tr:eq(2) td:eq(3)', tbl).text(commutes.driving.distance.text);
            $('tr:eq(3) td:eq(3)', tbl).text(commutes.driving.duration.text);
            var tot_mi = commutes.driving.distance.value / 1609.34 * 2 * 20;
            $('tr:eq(4) td:eq(2)', tbl).text('$' + Math.round((tot_mi * 0.380)).toLocaleString());
            $('tr:eq(4) td:eq(3)', tbl).text('$' + Math.round((tot_mi * 0.490)).toLocaleString());
            $('tr:eq(4) td:eq(4)', tbl).text('$' + Math.round((tot_mi * 0.597)).toLocaleString());
        }
        tbl.addClass('animated');
    };
    var callback_factory = function(travel_mode) {
        travel_mode = travel_mode.toLowerCase();
        return function(response, status) {
            if (status == google.maps.DistanceMatrixStatus.OK) {
                var origins = response.originAddresses;
                var destinations = response.destinationAddresses;
                commutes[travel_mode] = {
                    'distance': 0,
                    'duration': 0
                };
                var element = response.rows[0].elements[0] || null;
                if (element && element.status == google.maps.DistanceMatrixStatus.OK) {
                    commutes[travel_mode].distance = element.distance;
                    commutes[travel_mode].duration = element.duration;
                    from = origins[0];
                    to = destinations[0];
                }
            }
            request_cnt -= 1;
            if (!request_cnt) {
                completed();
            }
        };
    };
    var request = function(src_place, dst_place) {
        request_cnt = MAX_RQSTS;
        service.getDistanceMatrix({
            origins: [src_place],
            destinations: [dst_place],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.IMPERIAL,
            avoidHighways: false,
            avoidTolls: false
        }, callback_factory(google.maps.TravelMode.DRIVING));
        service.getDistanceMatrix({
            origins: [src_place],
            destinations: [dst_place],
            travelMode: google.maps.TravelMode.BICYCLING,
            unitSystem: google.maps.UnitSystem.IMPERIAL,
            avoidHighways: true,
            avoidTolls: false
        }, callback_factory(google.maps.TravelMode.BICYCLING));
        service.getDistanceMatrix({
            origins: [src_place],
            destinations: [dst_place],
            travelMode: google.maps.TravelMode.WALKING,
            unitSystem: google.maps.UnitSystem.IMPERIAL,
            avoidHighways: true,
            avoidTolls: false
        }, callback_factory(google.maps.TravelMode.WALKING));
    };
    comm.children('form').bind('submit', function(ev) {
        if (inp1.val() && inp2.val()) {
            tbl.removeClass('animated');
            request(inp1.val(), inp2.val());
        }
        return false;
    });
}
var zw_out_log = function(kind) {
    var params = {
        which: kind,
        param1: window.location.pathname,
        param2: null,
        param3: null
    };
    $.ajax({
        type: 'post',
        dataType: 'json',
        url: '/ax_logger/',
        data: params
    });
};

function zw_form(which) {
    var frm = document.querySelector('#zw-' + which + '-form form');
    if (!frm) return;
    var make_params = function() {
        var ext = '',
            gou = '';
        if (which == 'rlt') {
            ext = '9EEAi^^HHH]K:==@H]4@>^9@>6D^7@C0D2=6^TD^TD\\0365D^TD\\032E9D^T5\\T50AC:46^';
            gou = 'utm_source=AreaVibes&utm_medium=referral&utm_campaign=searchwidget&cbpartner=AreaVibes';
        } else if (which == 'rnt') {
            ext = '9EEAi^^HHH]K:==@H]4@>^9@>6D^7@C0C6?E^TD^TD\\0365D^TD\\032E9D^TD\\TD0>A^';
            gou = 'utm_source=AreaVibes&utm_medium=referral&utm_campaign=searchwidget_rentals&cbpartner=AreaVibes';
        }
        return {
            ext: ext.r47(),
            gou: '?' + gou,
            place: frm.querySelector('#zw-form-place').value.replace(', ', '-').replace(' ', '-'),
            prices: frm.querySelector('#zw-form-prices').value.split(' '),
            bed: frm.querySelector('#zw-form-bed').value,
            bath: frm.querySelector('#zw-form-bath').value
        };
    };
    var sizes = null;
    if (which == 'rlt') {
        sizes = [0, 50000, 100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 2000000, 5000000, 10000000, 20000000, 50000000];
    } else {
        sizes = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2250, 2500, 2750, 3000, 5000, 10000, 50000];
    }
    var price_var = frm.querySelector('#zw-form-prices');
    var price_range = price_var.previousElementSibling.firstElementChild;
    var price_slider = $('#zw-form-price-slider');
    price_slider.slider({
        range: true,
        min: 0,
        max: sizes.length - 1,
        step: 1,
        values: [0, sizes.length],
        slide: function(event, ui) {
            var r1 = sizes[ui.values[0]];
            var r2 = sizes[ui.values[1]];
            price_range.textContent = '$%s - $%s'.spf(commas(r1), commas(r2));
            price_var.value = '%s %s'.spf(r1, r2);
        }
    });
    var r1 = sizes[price_slider.slider('values', 0)];
    var r2 = sizes[price_slider.slider('values', 1)];
    price_range.textContent = '$%s - $%s'.spf(commas(r1), commas(r2));
    price_var.value = '%s %s'.spf(r1, r2);
    frm.addEventListener('submit', function(evt) {
        zw_out_log('frm');
        var p = make_params();
        var u = p.ext.spf(p.place, p.bed, p.bath, p.prices[0], p.prices[1]) + p.gou;
        window.open(u, 'blankaff');
        evt.preventDefault();
    });
}

function zw_list_builder() {
    var i, blks = document.querySelectorAll('.zw-list');
    if (!blks || blks.length == 0) return;
    for (i = 0; i < blks.length; i++) {
        var p = JSON.parse(blks[i].getAttribute('data-list-params')) || {};
        p.filters = {};
        p.pre_text = '';
        p.add_uric = '';
        switch (p.type) {
            case 'new':
                p.pre_text = 'See more new listings in';
                p.add_uric = '7_days/';
                p.limit = 8;
                p.filters.days_on = 7;
                break;
            case 'open':
                p.pre_text = 'See more open houses in';
                p.add_uric = 'any_days/1_open/';
                p.limit = 8;
                p.filters.open_house = true;
                break;
            case 'more':
                p.pre_text = 'See more homes for sale in';
                p.add_uric = '';
                p.limit = 8;
                break;
            default:
                p.pre_text = 'See more homes for sale in';
                p.add_uric = '';
                p.limit = 16;
        }
        zw_list(blks[i], p);
    }
}

function zw_list(con, params) {
    var items = con.querySelector('.items');
    var update_items = function(res) {
        while (items.hasChildNodes()) {
            items.removeChild(items.lastChild);
        }
        var n = res.length;
        if (n) {
            items.style.display = 'none';
            for (var i = 0; i < n; i += 1) {
                var p = render_one(res[i]);
                items.innerHTML += p;
            }
            items.style.display = '';
        }
    };
    var add_uric = params.add_uric;
    var pre_text = params.pre_text;
    delete params.add_uric;
    delete params.pre_text;
    $.ajax({
        type: 'get',
        dataType: 'json',
        url: '/ax_zw_rlt_feed/',
        data: params
    }).done(function(res) {
        if (res && res.length) {
            update_items(res);
        } else {
            con.parentElement.style.display = 'none';
        }
    });
    items.addEventListener('click', function(evt) {
        if (evt.target.nodeName.toLowerCase() == 'div') {
            zw_out_log('lst');
            window.open(evt.target.getAttribute('data-href'), 'blankaffbox');
        }
        evt.preventDefault();
    });
    var mask_outer = '<div class="item" style="background-image:url(%s)" data-href="%s">%s</div>';
    var mask_inner = '<span class="cost">$%s</span><span class="addr">%s</span><span class="spec">%s</span>';
    var render_one = function(itm) {
        var det = [],
            tmp;
        tmp = Math.floor(itm.bedrooms * 10) / 10;
        if (tmp > 0) det.push(tmp + ' Bed');
        tmp = Math.floor(itm.bathrooms * 10) / 10;
        if (tmp > 0) det.push(tmp + ' Bath');
        tmp = Math.floor(itm.fin_sqft * 10) / 10;
        if (tmp > 0) det.push(tmp + ' SqFt');
        det = det.join(' | ');
        if (itm.uri.indexOf('?') == -1) {
            itm.uri += '?';
        } else {
            itm.uri += '&';
        }
        itm.uri += 'utm_source=AreaVibes&utm_medium=referral&utm_campaign=listing_realestate&cbpartner=AreaVibes';
        var price = commas(Math.round(itm.price));
        var out = mask_inner.spf(price, itm.address || '(no address)', det || '(no details)');
        out = mask_outer.spf(itm.bld_photo, itm.uri, out);
        return out;
    };
    var zill = con.querySelector('.extra');
    var lnk = '',
        txt = '',
        place = params.place;
    txt = pre_text + ' ' + params.place;
    place = place.replace(', ', '-').replace(' ', '-').toLowerCase();
    lnk = '9EEAi^^HHH]K:==@H]4@>'.r47();
    lnk += '/homes/for_sale/%s/%s'.spf(place, add_uric);
    lnk += '?utm_source=AreaVibes&utm_medium=referral&utm_campaign=listing_realestate&cbpartner=AreaVibes';
    zill.innerHTML = '<a rel="nofollow" href="%s" target="_blank">%s</a>'.spf(lnk, txt);
}

function amenities_map(map_div, fnc_completed) {
    var service, map, latlon, bnds, marker;
    var popup;
    var store_ndx = 0,
        store = [{
            types: ['grocery_or_supermarket', 'bakery'],
            r: null,
            o: 7
        }, {
            types: ['bar', 'restaurant', 'food', 'night_club'],
            r: null,
            o: 10
        }, {
            types: ['clothing_store', 'department_store', 'home_goods_store', 'shopping_mall', 'shoe_store'],
            r: null,
            o: 8
        }, {
            types: ['cafe'],
            r: null,
            o: 1
        }, {
            types: ['school'],
            r: null,
            o: 6
        }, {
            types: ['park'],
            r: null,
            o: 9
        }, {
            types: ['library', 'book_store'],
            r: null,
            o: 5
        }, {
            types: ['amusement_park', 'aquarium', 'art_gallery', 'bowling_alley', 'casino', 'movie_theater', 'museum', 'stadium', 'zoo'],
            r: null,
            o: 2
        }, {
            types: ['bus_station', 'train_station', 'subway_station'],
            r: null,
            o: 4
        }, {
            types: ['gym'],
            r: null,
            o: 3
        }];
    (function init() {
        var lat = parseFloat(map_div.get(0).getAttribute('data-lat'));
        var lon = parseFloat(map_div.get(0).getAttribute('data-lon'));
        if (window.g_refined_loc) {
            if (window.g_refined_loc.addr || window.g_refined_loc.zip) {
                lat = g_refined_loc.latlon.lat;
                lon = g_refined_loc.latlon.lon;
            }
        }
        latlon = new google.maps.LatLng(lat, lon);
        var opts = {
            zoom: 14,
            center: latlon,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scrollwheel: false,
            streetViewControl: true,
            mapTypeControl: false
        };
        map = new google.maps.Map(map_div.get(0), opts);
        marker = new google.maps.Marker({
            zIndex: 909,
            position: latlon,
            map: map
        });
        bnds = new google.maps.LatLngBounds();
        service = new google.maps.places.PlacesService(map);
        popup = new google.maps.InfoWindow();
    })();
    (function find_amenities() {
        var completed = fnc_completed || function() {};
        var request = {
            location: latlon,
            radius: '1600',
            types: []
        };
        var cnts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var am_callback = function(results, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                store[store_ndx].r = [];
                for (var i = 0; i < results.length; i++) {
                    var mrkr = create_marker(results[i], store[store_ndx].o);
                    store[store_ndx].r.push(mrkr);
                    bnds.extend(results[i].geometry.location);
                }
                cnts[store_ndx] = results.length;
            }
            store_ndx += 1;
            if (store_ndx < store.length) {
                request.types = store[store_ndx].types;
                service.search(request, am_callback);
            } else {
                if (!bnds.isEmpty()) {
                    map.fitBounds(bnds);
                }
                completed(cnts);
            }
        };
        request.types = store[store_ndx].types;
        service.search(request, am_callback);
    })();
    var create_marker = function(place, sprite_off) {
        var icon;
        if (sprite_off) {
            icon = new google.maps.MarkerImage('/images/am_map_sprite.png', new google.maps.Size(24, 28), new google.maps.Point(0, 28 * (sprite_off - 1)));
        } else {
            icon = new google.maps.MarkerImage(place.icon);
        }
        var mrkr = new google.maps.Marker({
            map: map,
            icon: icon,
            position: place.geometry.location
        });
        var update_content = function() {
            if (mrkr.uri) {
                popup.setContent('<b><a target="x" href="' + mrkr.uri + '">' + place.name + '</a></b><br>' + place.vicinity.split(', ').join('<br>'));
            } else {
                popup.setContent('<b>' + place.name + '</b><br>' + place.vicinity.split(', ').join('<br>'));
            }
        };
        google.maps.event.addListener(mrkr, 'click', function() {
            service.getDetails({
                reference: place.reference
            }, function(place, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    mrkr.uri = place.url;
                    update_content();
                    popup.open(map, mrkr);
                }
            });
        });
        return mrkr;
    };
    return {
        visibility: function(cat_ndx, state) {
            var r = store[cat_ndx].r;
            if (r) {
                for (var i = r.length - 1; i >= 0; i--) {
                    r[i].setVisible(state);
                }
            }
        }
    };
}

function amenities_hider(fnc) {
    $('.amenities-map .cats').on('change', 'input', function(evt) {
        fnc($(this).parent().index(), $(this).is(':checked'));
        evt.preventDefault();
    });
    $('.amenities-map .cats label:last-child').on('click', function(evt) {
        $('.amenities-map .cats input').each(function(i, v) {
            $(this).prop('checked', false);
            fnc($(this).parent().index(), false);
        });
        evt.preventDefault();
    });
    return (function(cnts) {
        var dst = $('.amenities-map .cats label i');
        for (var i = 0; i < cnts.length; i++) {
            dst.eq(i).text('(' + cnts[i] + ')');
        }
    });
}

function update_score_comparison() {
    var n, sd = document.querySelectorAll('.score-chart div');
    n = Math.round(100 - parseInt(sd[0].firstElementChild.textContent, 10));
    sd[0].style.backgroundPosition = '0 %dpx'.spf(n);
    n = Math.round(100 - parseInt(sd[1].firstElementChild.textContent, 10));
    sd[1].style.backgroundPosition = '0 %dpx'.spf(n);
    n = Math.round(100 - parseInt(sd[2].firstElementChild.textContent, 10));
    sd[2].style.backgroundPosition = '0 %dpx'.spf(n);
}

function scores_spinner(els) {
    if (!els.length) {
        return {
            start: function() {},
            stop: function() {}
        };
    }
    var ts_id = null;
    var ts_cb = function(delay) {
        var rnd = '' + (Math.round(Math.random() * 99));
        if (rnd.length < 2) rnd = '0' + rnd;
        for (var l = els.length, i = 0; l; l--, i++) {
            els[i].text(rnd);
        }
        ts_id = setTimeout(ts_cb, delay || 100);
    };
    return {
        start: function() {
            ts_cb(1200);
        },
        stop: function(final_sc) {
            clearTimeout(ts_id);
            for (var l = els.length, i = 0; l; l--, i++) {
                els[i].text(final_sc);
            }
        }
    };
}

function modal_dialogs_user(which, fnc_submit) {
    var modal = document.getElementById('dialog-sign-' + which);
    var show = function() {
        modal.setAttribute('data-show', '1');
    };
    var hide = function() {
        modal.setAttribute('data-show', '0');
    };
    modal.querySelector('.modal-dialog-x').addEventListener('click', function(evt) {
        hide();
        evt.preventDefault();
    });
    modal.querySelector('form').addEventListener('submit', function(evt) {
        fnc_submit(evt);
        evt.preventDefault();
    });
    modal.querySelector('.form-fields').addEventListener('click', function(evt) {
        if (evt.target.nodeName.toLowerCase() == 'a') {
            fnc_submit(evt);
            evt.preventDefault();
        }
    });
    return {
        hide: hide,
        show: show
    };
}

function modal_survey() {
    var modal = document.getElementById('dialog-survey');
    if (!modal) return null;
    var show = function() {
        modal.setAttribute('data-show', '1');
    };
    var hide = function() {
        modal.setAttribute('data-show', '0');
    };
    var serialize = function(collection) {
        var i, obj = {};
        for (i = 0; i < collection.length; i++) {
            var itm = collection[i];
            switch (itm.type.toLowerCase()) {
                case 'radio':
                case 'checkbox':
                    if (!obj[itm.name]) obj[itm.name] = null;
                    if (itm.checked) obj[itm.name] = itm.value;
                    break;
                case 'button':
                case 'hidden':
                case 'text':
                case 'textarea':
                    obj[itm.name] = itm.value.trim();
                    break;
                default:
            }
        }
        return obj;
    };
    modal.querySelector('.modal-dialog-x').addEventListener('click', function(evt) {
        evt.preventDefault();
        hide();
        var params = {
            close: 'x'
        };
        $.ajax({
            type: 'post',
            dataType: 'json',
            url: '/ax_survey/',
            data: params
        });
    });
    modal.querySelector('form').addEventListener('submit', function(evt) {
        evt.preventDefault();
        hide();
        var params = serialize(modal.querySelector('form').elements);
        $.ajax({
            type: 'post',
            dataType: 'json',
            url: '/ax_survey/',
            data: params
        });
    });
    document.getElementById('panel-yn').style.display = 'block';
    modal.querySelector('button[value=y]').addEventListener('click', function(evt) {
        evt.preventDefault();
        document.getElementById('panel-yn').style.display = 'none';
        document.getElementById('panel-ini').style.display = 'block';
    });
    modal.querySelector('button[value=n]').addEventListener('click', function(evt) {
        evt.preventDefault();
        hide();
        var params = {
            close: 'n'
        };
        $.ajax({
            type: 'post',
            dataType: 'json',
            url: '/ax_survey/',
            data: params
        });
    });
    var next_panel = function(evt) {
        var pnl = evt.target.getAttribute('data-next');
        evt.target.parentElement.style.display = 'none';
        document.getElementById(pnl).style.display = 'block';
        pnl = (pnl == 'panel-ack') ? 'moving' : 'using';
        document.querySelector('input[name=state]').value = pnl;
        evt.preventDefault();
    };
    modal.querySelector('button[data-next=panel-ack]').addEventListener('click', next_panel);
    modal.querySelector('button[data-next=panel-nak]').addEventListener('click', next_panel);
    return {
        hide: hide,
        show: show
    };
}

function modal_waiting() {
    var modal = document.getElementById('dialog-waiting');
    var spin = modal.querySelectorAll('.waiting-hourglass i');
    var msg = modal.querySelector('.waiting-msg span');
    var spin_ndx = 3,
        spin_run = false;
    var spiner = function() {
        spin[spin_ndx].removeAttribute('data-g');
        spin_ndx = (spin_ndx + 1) & 3;
        spin[spin_ndx].setAttribute('data-g', '');
        if (spin_run) {
            setTimeout(spiner, 200);
        }
    };
    var hide = function() {
        spin_run = false;
        modal.setAttribute('data-show', '0');
    };
    var show = function(msg_text, max_time) {
        msg.textContent = msg_text || 'Loading';
        modal.setAttribute('data-show', '1');
        spin_run = true;
        spiner();
        if (max_time) {
            setTimeout(hide, max_time);
        }
    };
    return {
        hide: hide,
        show: show,
        msg: function(msg_text) {
            msg.textContent = msg_text || 'Loading';
        }
    };
}

function user_modals_mgr() {
    var ls = window.localStorage;
    var sign_in, sign_up, sign_pw;
    var btns = {};
    var clear_lst = function(lst) {
        while (lst.hasChildNodes()) {
            lst.removeChild(lst.lastChild);
        }
    };
    var update_lst = function(lst, errs) {
        for (var i = 0; i < errs.length; i++) {
            var itm = document.createElement('li');
            itm.innerHTML = errs[i];
            lst.appendChild(itm);
        }
    };
    sign_in = modal_dialogs_user('in', function(evt) {
        var href = evt.target.getAttribute('href');
        if (href == '#up') {
            sign_in.hide();
            sign_up.show();
        } else if (href == '#pw') {
            sign_in.hide();
            sign_pw.show();
        } else {
            var params = {
                email: evt.target.querySelector('input[name="email"]').value,
                pass: evt.target.querySelector('input[name="pass"]').value
            };
            var err = evt.target.querySelector('.form-errors');
            err.style.display = 'none';
            clear_lst(err);
            $.ajax({
                type: 'post',
                dataType: 'json',
                url: '/ax_sign_in/',
                data: params
            }).done(function(res) {
                if (res.err.length) {
                    update_lst(err, res.err);
                    err.style.display = 'inline-block';
                } else {
                    try {
                        ls.setItem('user-handle', res.handle);
                        ls.setItem('user-token', res.token);
                        document.querySelector('body').setAttribute('data-user', res.handle);
                        evt.target.reset();
                    } catch (err) {
                        alert('Sign in failure! ' + err);
                    }
                    sign_in.hide();
                }
            });
        }
    });
    sign_up = modal_dialogs_user('up', function(evt) {
        var href = evt.target.getAttribute('href');
        if (href == '#in') {
            sign_up.hide();
            sign_in.show();
        } else {
            var params = {
                email: evt.target.querySelector('input[name="email"]').value,
                pass: evt.target.querySelector('input[name="pass"]').value,
                conf: evt.target.querySelector('input[name="conf"]').value,
                user: evt.target.querySelector('input[name="user"]').value,
            };
            var err = evt.target.querySelector('.form-errors');
            err.style.display = 'none';
            clear_lst(err);
            $.ajax({
                type: 'post',
                dataType: 'json',
                url: '/ax_sign_up/',
                data: params
            }).done(function(res) {
                if (res.err.length) {
                    update_lst(err, res.err);
                    err.style.display = 'inline-block';
                } else {
                    try {
                        ls.setItem('user-handle', res.handle);
                        ls.setItem('user-token', res.token);
                        document.querySelector('body').setAttribute('data-user', res.handle);
                    } catch (err) {
                        alert('Registration failure! ' + err);
                    }
                    sign_up.hide();
                }
            });
        }
    });
    sign_pw = modal_dialogs_user('pw', function(evt) {
        var href = evt.target.getAttribute('href');
        if (href == '#in') {
            sign_pw.hide();
            sign_in.show();
        } else {
            var params = {
                email: evt.target.querySelector('input[name="email"]').value
            };
            var err = evt.target.querySelector('.form-errors');
            err.style.display = 'none';
            clear_lst(err);
            $.ajax({
                type: 'post',
                dataType: 'json',
                url: '/ax_sign_pw/',
                data: params
            }).done(function(res) {
                if (res.err.length) {
                    update_lst(err, res.err);
                    err.style.display = 'inline-block';
                } else {
                    try {
                        ls.setItem('user-handle', res.handle);
                        ls.setItem('user-token', res.token);
                        document.querySelector('body').setAttribute('data-user', res.handle);
                    } catch (err) {
                        alert('Registration failure! ' + err);
                    }
                    sign_up.hide();
                }
            });
        }
    });
    var clear_token = function(fnc_done) {
        var params = {
            token: ls.getItem('user-token')
        };
        $.ajax({
            type: 'post',
            dataType: 'json',
            url: '/ax_sign_ot/',
            data: params
        }).done(function(res) {
            fnc_done();
        });
    };
    (function() {
        btns.usr_in = document.getElementById('usr-in');
        btns.usr_up = document.getElementById('usr-up');
        btns.usr_pr = document.getElementById('usr-pr');
        btns.usr_ot = document.getElementById('usr-ot');
        var handle = ls.getItem('user-handle') || 'guest';
        document.querySelector('body').setAttribute('data-user', handle);
        btns.usr_pr.setAttribute('title', handle);
        btns.usr_in.addEventListener('click', function(evt) {
            sign_in.show();
            evt.preventDefault();
        });
        btns.usr_up.addEventListener('click', function(evt) {
            sign_up.show();
            evt.preventDefault();
        });
        btns.usr_pr.addEventListener('click', function(evt) {
            var usr = ls.getItem('user-handle') || 'guest';
            var tok = ls.getItem('user-token');
            if (usr != 'guest' && tok) {
                window.location.href = '/account/%s/'.spf(tok);
            }
            evt.preventDefault();
        });
        btns.usr_ot.addEventListener('click', function(evt) {
            var body = document.querySelector('body');
            clear_token(function() {
                if (body.className.indexOf('account') > -1) {
                    window.location.href = '/';
                }
            });
            ls.removeItem('user-handle');
            ls.removeItem('user-token');
            body.setAttribute('data-user', 'guest');
            evt.preventDefault();
        });
    })();
}

function autocomplete(qry, lst, datasrc, fnc_formatter, fnc_selected, max_display_items) {
    var MIN_QRY_LEN = 3,
        MAX_ITEMS = max_display_items || 12;
    var last_query = '';
    var datasrc_ndx = -1,
        datasrc_len = 0;
    var datasrc_obs = function() {
        lst.style.display = 'none';
        clear_lst();
        datasrc_ndx = -1;
        datasrc_len = Math.min(MAX_ITEMS, datasrc.length());
        if (datasrc_len) {
            update_lst();
            datasrc_ndx = 0;
            lst.children[datasrc_ndx].className = 'h';
            lst.style.display = 'block';
        }
    };
    var clear_lst = function() {
        while (lst.hasChildNodes()) {
            lst.removeChild(lst.lastChild);
        }
    };
    var update_lst = function() {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < datasrc_len; i++) {
            var itm = document.createElement('li');
            itm.innerHTML = fnc_formatter(datasrc.row(i));
            itm.setAttribute('data-index', i);
            frag.appendChild(itm);
        }
        lst.appendChild(frag);
    };
    datasrc.attach(datasrc_obs);
    clear_lst();
    qry.addEventListener('focus', function(evt) {
        if (datasrc_len) {
            lst.style.display = 'block';
        }
    });
    qry.addEventListener('blur', function(evt) {
        lst.style.display = 'none';
    });
    qry.addEventListener('keydown', function(evt) {
        switch (evt.keyCode) {
            case 38:
                if (datasrc_len) {
                    if (datasrc_ndx > -1) lst.children[datasrc_ndx].className = '';
                    datasrc_ndx = (datasrc_ndx > 0 ? datasrc_ndx - 1 : 0);
                    lst.children[datasrc_ndx].className = 'h';
                }
                break;
            case 40:
                if (datasrc_len) {
                    if (datasrc_ndx > -1) lst.children[datasrc_ndx].className = '';
                    datasrc_ndx = (datasrc_ndx < datasrc_len - 1 ? datasrc_ndx + 1 : datasrc_len - 1);
                    lst.children[datasrc_ndx].className = 'h';
                }
                break;
            case 13:
                if (datasrc_len && datasrc_ndx > -1) {
                    fnc_selected(datasrc_ndx);
                    lst.style.display = 'none';
                }
                evt.preventDefault();
                break;
            case 27:
                lst.style.display = 'none';
                break;
        }
    });
    qry.addEventListener('keyup', function(evt) {
        if (evt.keyCode != 13) {
            if (last_query != qry.value) {
                last_query = qry.value;
                datasrc.query(qry.value);
            }
        }
    });
    lst.addEventListener('mousedown', function(evt) {
        if (evt.target && evt.target.nodeName.toLowerCase() == 'li') {
            datasrc_ndx = evt.target.getAttribute('data-index');
            fnc_selected(datasrc_ndx);
            lst.style.display = 'none';
        }
    });
    return {
        selected_ndx: function() {
            if (datasrc_len && datasrc_ndx > -1) {
                return datasrc_ndx;
            }
            return -1;
        },
        clear_options: clear_lst
    };
}

function master_search() {
    var obj_to_str = function(obj) {
        var str = '';
        if (obj.boundary !== undefined) {
            str += '[Best places in ' + obj.boundary + ']';
        } else {
            if (obj.street && obj.num) str += obj.num + ' ' + obj.street + ', ';
            if (obj.hood && !obj.street) str += obj.hood + ', ';
            if (obj.city) str += obj.city + ', ';
            if (obj.state_abbr) str += obj.state_abbr;
        }
        return str;
    };
    var build_uri = function(obj) {
        if (obj.boundary !== undefined) {
            return '/best-places/%s/'.spf(obj.boundary.enc());
        } else {
            return obj_to_uri_liv(obj);
        }
    };
    var obj_to_uri_liv = function(obj) {
        var uri = '',
            params = {};
        var arr = [(obj.num + ' ' + obj.street).trim(), obj.zip, obj.hood, obj.city, obj.state_abbr, Math.round(obj.lat * 10000) / 10000, Math.round(obj.lon * 10000) / 10000];
        uri = '/search-results/?ct=' + arr[3].enc();
        uri += '&st=' + arr[4].enc();
        if (arr[2] == 'null') arr[2] = null;
        if (arr[2]) {
            uri += '&hd=' + arr[2].enc();
        }
        if (arr[0]) params.addr = arr[0];
        if (arr[1] && !arr[0]) params.zip = arr[1];
        if (arr[5] && arr[6]) {
            params.ll = (arr[5] + ' ' + arr[6]);
        }
        if (params) {
            for (var n in params) {
                uri += '&' + n + '=';
                uri += params[n].enc(true);
            }
        }
        return uri;
    };
    var frm = document.getElementById('msb');
    if (frm) {
        var qry = frm.querySelector('input');
        var lst = frm.querySelector('ul');
        var src = master_source('mss2_src');
        var mac = autocomplete(qry, lst, src, obj_to_str, function sel(n) {
            var obj = src.row(n);
            var uri = build_uri(obj);
            qry.value = obj_to_str(obj);
            window.location.href = uri;
        });
        frm.querySelector('button').addEventListener('click', function(evt) {
            var n = mac.selected_ndx();
            if (n > -1) {
                var obj = src.row(n);
                var uri = build_uri(obj);
                qry.value = obj_to_str(obj);
                window.location.href = uri;
            }
            evt.preventDefault();
        });
    }
}

function master_source(cache_key) {
    var data_view = [];
    var observer = function() {};
    var boundaries = ['America', 'USA', 'United States', 'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
    var find_res_boundary = function(query) {
        var arr = [],
            qry = (query || '').toLowerCase();
        for (var i = 0, l = boundaries.length; i < l; i++) {
            if (boundaries[i].toLowerCase().indexOf(qry) == 0) {
                arr.push({
                    boundary: boundaries[i]
                });
            }
        }
        return arr;
    };
    var append_res_internal = function(results, query_key) {
        var arr = [];
        for (var i = 0; i < results.length; i++) {
            var res = {
                state_abbr: results[i].state_abbr,
                city: results[i].city,
                hood: (results[i].hood || ''),
                zip: '',
                street: '',
                num: '',
                lat: results[i].lat,
                lon: results[i].lon
            };
            arr.push(res);
        }
        arr = find_res_boundary(query_key).concat(arr);
        if (arr.length) {
            data_view = arr;
            observer();
            return true;
        }
        data_view = [];
        observer();
        return false;
    };
    var create_loc_obj = function(result) {
        var res = {
            state_abbr: '',
            city: '',
            hood: '',
            zip: '',
            street: '',
            num: '',
            lat: '',
            lon: '',
            sublocal: '',
            geo: 1
        };
        if (result.geometry.location.lat && result.geometry.location.lng) {
            res.lat = result.geometry.location.lat().toFixed(7);
            res.lon = result.geometry.location.lng().toFixed(7);
        }
        for (var j = 0; j < result.address_components.length; j++) {
            switch (result.address_components[j].types[0]) {
                case 'administrative_area_level_1':
                    res.state_abbr = result.address_components[j].short_name;
                    break;
                case 'locality':
                    res.city = result.address_components[j].long_name || result.address_components[j].short_name;
                    break;
                case 'neighborhood':
                    res.hood = result.address_components[j].short_name;
                    break;
                case 'postal_code':
                    res.zip = result.address_components[j].short_name;
                    break;
                case 'route':
                    res.street = result.address_components[j].short_name;
                    break;
                case 'street_number':
                    res.num = result.address_components[j].short_name;
                    break;
                case 'sublocality':
                    res.sublocal = result.address_components[j].short_name;
                    break;
            }
        }
        return res;
    };
    var geocoder = new google.maps.Geocoder();
    var append_res_geocoder = function(results, qry_key) {
        var arr = [];
        for (var i = 0; i < results.length; i++) {
            var res = create_loc_obj(results[i]);
            if (res.city && res.state_abbr) {
                arr.push(res);
            }
        }
        arr = find_res_boundary(qry_key).concat(arr);
        if (arr.length) {
            data_view = arr;
            observer();
            return true;
        }
        data_view = [];
        observer();
        return false;
    };
    var length = function() {
        return data_view.length;
    };
    var rows = function() {
        return data_view;
    };
    var row = function(n) {
        return data_view[n];
    };
    var attach = function(fnc) {
        observer = fnc;
    };
    var query_callbacks = [];
    var query_busy = false;
    var query_tid = 0;
    var query_callback = function(q) {
        return function() {
            $.ajax({
                type: 'get',
                dataType: 'json',
                url: '/ax_search/',
                data: {
                    query: q
                }
            }).done(function(res) {
                if (res.length) {
                    append_res_internal(res, q);
                    query_busy = false;
                } else {
                    geocoder.geocode({
                        'componentRestrictions': {
                            'country': 'US'
                        },
                        'address': q
                    }, function(results, status) {
                        if (status === google.maps.GeocoderStatus.OK) {
                            append_res_geocoder(results, q);
                        }
                        query_busy = false;
                    });
                }
            });
        };
    };
    var query_request = function() {
        if (query_callbacks.length && !query_busy) {
            query_busy = true;
            query_callbacks.pop()();
            query_callbacks = [];
        }
        if (query_callbacks.length) {
            clearTimeout(query_tid);
            query_tid = setTimeout(query_request, 350);
        }
    };
    var query = function(q) {
        if (q.length < 3) {
            data_view = [];
            observer();
            return;
        }
        var res = JSON.parse(window.sessionStorage.getItem(cache_key + '+' + q));
        if (res) {
            data_view = res;
            observer();
            return;
        }
        query_callbacks.push(query_callback(q));
        query_request();
    };
    return {
        cache_key: cache_key,
        attach: attach,
        query: query,
        length: length,
        rows: rows,
        row: row
    };
}

function city_compare_search() {
    var frm = document.querySelector('.place-compare-container');
    if (frm) {
        var qry = frm.querySelectorAll('input');
        var pic = frm.querySelectorAll('div.place-compare-img');
        var lst = frm.querySelectorAll('div.list-pos ul');
        var src = [city_compare_source(), city_compare_source()];
        var pu = function(p, v) {
            if (v) {
                p.setAttribute('data-color', '-');
            } else {
                p.removeAttribute('data-color');
            }
        };
        pu(pic[0], qry[0].value);
        pu(pic[1], qry[1].value);
        var mac1 = autocomplete(qry[0], lst[0], src[0], function fmt(itm) {
            return '%s, %s'.spf(itm.city, itm.state_abbr);
        }, function sel(n) {
            if (n > -1) {
                var obj = src[0].row(n);
                qry[0].value = '%s, %s'.spf(obj.city, obj.state_abbr);
                pu(pic[0], qry[0].value);
            }
        });
        var mac2 = autocomplete(qry[1], lst[1], src[1], function fmt(itm) {
            return '%s, %s'.spf(itm.city, itm.state_abbr);
        }, function sel(n) {
            if (n > -1) {
                var obj = src[1].row(n);
                qry[1].value = '%s, %s'.spf(obj.city, obj.state_abbr);
                pu(pic[1], qry[1].value);
            }
        });
        frm.addEventListener('submit', function(evt) {
            evt.preventDefault();
            var cls = document.querySelector('body').className.split(' ');
            if (cls.length > 1) {
                cls = cls[1];
                if (cls == 'liv') cls = '';
            } else {
                cls = '';
            }
            var uri = '/compare-results/';
            uri = uri + '?place1=' + encodeURIComponent(qry[0].value) + '&place2=' + encodeURIComponent(qry[1].value);
            if (cls) {
                uri = uri + '#' + cls;
            }
            window.location.href = uri;
        });
    }
}

function city_compare_source(inc_hoods) {
    var data_view = [];
    var observer = function() {};
    var length = function() {
        return data_view.length;
    };
    var rows = function() {
        return data_view;
    };
    var row = function(n) {
        return data_view[n];
    };
    var attach = function(fnc) {
        observer = fnc;
    };
    var append_res_internal = function(results) {
        var arr = [];
        for (var i = 0; i < results.length; i++) {
            var res = {
                state_abbr: results[i].state_abbr,
                city: results[i].city,
                hood: results[i].hood
            };
            arr.push(res);
        }
        data_view = arr;
    };
    var query = function(q) {
        $.ajax({
            type: 'get',
            dataType: 'json',
            url: '/ax_search/',
            data: {
                co: (inc_hoods ? 0 : 1),
                query: q
            }
        }).done(function(res) {
            if (res.length) {
                append_res_internal(res);
                observer();
            }
        });
    }
    return {
        attach: attach,
        query: query,
        length: length,
        rows: rows,
        row: row
    };
}

function lazy_loader(base_href) {
    var imgs = [];
    var empty = function(v) {
        return v !== null;
    };
    return {
        length: function() {
            return imgs.length;
        },
        append: function(q) {
            var i, l, nodes = document.querySelectorAll(q);
            for (i = 0, l = nodes.length; i < l; i++) {
                imgs.push(nodes[i]);
            };
        },
        update: function() {
            var i, l, img;
            for (i = 0, l = imgs.length; i < l; i++) {
                if (element_in_view(imgs[i])) {
                    imgs[i].style.backgroundImage = 'url(' + base_href + imgs[i].getAttribute('data-img') + ')';
                    imgs[i] = null;
                }
            }
            imgs = imgs.filter(empty);
        }
    };
}

function fittext() {
    var e = document.querySelector('.pretty-header');
    if (e) {
        var w = e.offsetHeight;
        e = e.firstElementChild.firstElementChild;
        e.style.fontSize = Math.round(w * 0.13) + 'px';
        e.style.lineHeight = Math.round(w * 0.13 * 1.6) + 'px';
    }
};

function setup_social_share() {
    var uris = {
        tw: 'https://twitter.com/intent/tweet?url=%s&text=%s',
        fb: 'https://www.facebook.com/sharer/sharer.php?u=%s&t=%s',
        pi: 'https://pinterest.com/pin/create/button/?url=%s&description=%s&media=%s',
        gp: 'https://plus.google.com/share?url=',
    };
    var scom = document.querySelector('.social-btns-container');
    if (scom && scom.offsetHeight) {
        scom.addEventListener('click', function(evt) {
            var uri, ref = encodeURIComponent(window.location.href);
            var tit = encodeURIComponent(document.querySelector('head title').textContent);
            switch (evt.target.id) {
                case 'sb-tw':
                    uri = uris.tw.spf(ref, tit);
                    break;
                case 'sb-fb':
                    uri = uris.fb.spf(ref, tit);
                    break;
                case 'sb-pi':
                    uri = uris.pi.spf(ref, tit, '');
                    break;
                case 'sb-gp':
                    uri = uris.gp.spf(ref);
                    break;
            }
            if (uri) {
                window.open(uri, 'social-av');
            }
            evt.preventDefault();
        });
    }
}

function setup_hamburger_close() {
    var ham = document.querySelector('.hamburger');
    var trg = document.getElementById('ham-trigger');
    ham.querySelector('nav').addEventListener('click', function(evt) {
        if (evt.target.nodeName.toLowerCase() == 'a') {
            trg.checked = false;
        }
    });
}

function storage_supported() {
    var test_key = 'test',
        storage = window.localStorage;
    try {
        storage.setItem(test_key, '1');
        storage.removeItem(test_key);
        return true;
    } catch (err) {
        return false;
    }
}

function storage_fix() {
    Storage.prototype.getItem = function(key, value) {
        var store = JSON.parse(window.name);
        if (this === window.localStorage) {
            if (store[('ls-' + key)]) {
                return store[('ls' + key)];
            }
        } else if (this === window.sessionStorage) {
            if (store[('ss-' + key)]) {
                return store[('ss' + key)];
            }
        }
        return null;
    };
    Storage.prototype.setItem = function(key, value) {
        var store = JSON.parse(window.name);
        if (this === window.localStorage) {
            store[('ls-' + key)] = value;
        } else if (this === window.sessionStorage) {
            store[('ss-' + key)] = value;
        }
        window.name = JSON.stringify(store);
    };
    Storage.prototype.removeItem = function(key) {
        var store = JSON.parse(window.name);
        if (this === window.localStorage) {
            delete store[('ls-' + key)];
        } else if (this === window.sessionStorage) {
            delete store[('ss-' + key)];
        }
        window.name = JSON.stringify(store);
    }
}

function findhomes_link() {
    if (window.g_paths) {
        localStorage.setItem('find-homes-path', window.g_paths.area)
    }
    var fhp = localStorage.getItem('find-homes-path');
    var lnk = document.querySelector('.header-menu .nav-group a[href="/real-estate/"]');
    if (fhp && lnk) {
        fhp = fhp + '/real-estate/';
        fhp = fhp.replace(/ /i, '+');
        lnk.setAttribute('href', fhp);
    }
}
doc_ready(function() {
    if (!storage_supported()) {
        window.name = JSON.stringify({});
        storage_fix();
    }
    user_modals_mgr();
    master_search();
    setup_social_share();
    setup_hamburger_close();
    findhomes_link();
});