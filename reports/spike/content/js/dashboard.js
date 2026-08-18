/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 99.8619017144397, "KoPercent": 0.13809828556030854};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9423744292237443, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.9887218045112782, 500, 1500, "08 POST checkout"], "isController": false}, {"data": [0.9916839916839917, 500, 1500, "02 GET profile"], "isController": false}, {"data": [0.9877754301237549, 500, 1500, "03 GET categories"], "isController": false}, {"data": [0.9983014206300185, 500, 1500, "05 POST add cart"], "isController": false}, {"data": [0.998758149642968, 500, 1500, "06 GET cart"], "isController": false}, {"data": [0.961670302274852, 500, 1500, "07 POST apply coupon"], "isController": false}, {"data": [0.9878982843137255, 500, 1500, "04 GET product detail"], "isController": false}, {"data": [0.5569199653279399, 500, 1500, "Flow A - Login Browse Cart Checkout"], "isController": true}, {"data": [0.9930489731437598, 500, 1500, "09 GET my orders"], "isController": false}, {"data": [0.9821637426900585, 500, 1500, "01 POST login"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 29689, 41, 0.13809828556030854, 105.90161339216539, 0, 4068, 47.0, 288.0, 448.0, 794.0, 157.20776057441807, 80.38046575492979, 50.980971334365], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["08 POST checkout", 3192, 0, 0.0, 110.85682957393469, 2, 1420, 57.0, 299.7000000000003, 421.0, 578.0700000000002, 17.22072961512317, 5.291591769373321, 8.970678953026036], "isController": false}, {"data": ["02 GET profile", 3367, 0, 0.0, 96.23403623403608, 1, 776, 43.0, 270.2000000000003, 378.0, 559.920000000001, 17.872213935761945, 8.292324132597814, 5.581039162482152], "isController": false}, {"data": ["03 GET categories", 3313, 0, 0.0, 95.97162692423798, 0, 1383, 42.0, 259.0, 389.2999999999997, 593.7200000000003, 17.8193964103033, 6.229828041883381, 2.8190841977237646], "isController": false}, {"data": ["05 POST add cart", 3238, 0, 0.0, 45.89777640518852, 1, 945, 20.0, 119.0, 186.04999999999973, 291.6100000000001, 17.458725588517574, 5.012563792015787, 9.171755621650329], "isController": false}, {"data": ["06 GET cart", 3221, 0, 0.0, 44.99441167339342, 1, 991, 19.0, 118.0, 185.0, 309.6999999999962, 17.367345508268496, 9.609938833823998, 5.355384016960256], "isController": false}, {"data": ["07 POST apply coupon", 3209, 0, 0.0, 151.8753505765036, 1, 1592, 78.0, 419.0, 589.0, 789.6000000000004, 17.297699389810045, 6.7820811698856165, 5.697205909800233], "isController": false}, {"data": ["04 GET product detail", 3264, 0, 0.0, 95.28523284313735, 1, 1255, 42.0, 266.0, 407.75, 593.0, 17.595118217200522, 9.31206718886451, 2.8088029750385433], "isController": false}, {"data": ["Flow A - Login Browse Cart Checkout", 3461, 41, 1.1846287200231147, 898.9604160647225, 0, 4068, 857.0, 1692.8000000000002, 1909.8999999999996, 2854.120000000008, 18.27484608154774, 77.67088549476995, 49.45978694801886], "isController": true}, {"data": ["09 GET my orders", 3165, 0, 0.0, 95.46097946287516, 1, 1363, 43.0, 269.4000000000001, 360.0, 547.6800000000003, 17.06677882748803, 16.735976232218736, 5.46271625839858], "isController": false}, {"data": ["01 POST login", 3420, 0, 0.0, 112.21666666666677, 2, 1330, 52.0, 318.9000000000001, 445.9499999999998, 596.9499999999998, 18.138136226949452, 11.706190326791406, 4.472756002291133], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Response was null", 41, 100.0, 0.13809828556030854], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 29689, 41, "Response was null", 41, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Flow A - Login Browse Cart Checkout", 300, 41, "Response was null", 41, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
