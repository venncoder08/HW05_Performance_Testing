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

    var data = {"OkPercent": 33.1857932292505, "KoPercent": 66.81420677074951};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.2996750569862748, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "08 POST checkout"], "isController": false}, {"data": [0.0, 500, 1500, "02 GET profile"], "isController": false}, {"data": [0.9990414569853823, 500, 1500, "03 GET categories"], "isController": false}, {"data": [0.0, 500, 1500, "05 POST add cart"], "isController": false}, {"data": [0.0, 500, 1500, "06 GET cart"], "isController": false}, {"data": [0.9987632945832303, 500, 1500, "07 POST apply coupon"], "isController": false}, {"data": [0.9990373044524669, 500, 1500, "04 GET product detail"], "isController": false}, {"data": [0.0, 500, 1500, "Flow A - Login Browse Cart Checkout"], "isController": true}, {"data": [0.0, 500, 1500, "09 GET my orders"], "isController": false}, {"data": [0.0, 500, 1500, "01 POST login"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 37278, 24907, 66.81420677074951, 21.066822254412852, 0, 3482, 1.0, 12.0, 57.0, 1242.900000000016, 197.66270400967156, 62.152387577613815, 51.44918097043119], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["08 POST checkout", 4000, 4000, 100.0, 4.963749999999997, 0, 395, 1.0, 5.0, 14.0, 107.0, 21.6015380295077, 6.223099334672629, 8.704866075527077], "isController": false}, {"data": ["02 GET profile", 4199, 4199, 100.0, 5.2398190045248745, 0, 728, 1.0, 5.0, 15.0, 98.0, 22.47124868217552, 6.473650743400174, 4.36697117944622], "isController": false}, {"data": ["03 GET categories", 4173, 0, 0.0, 10.71603163191946, 0, 1120, 1.0, 12.0, 43.0, 202.78000000000065, 22.324103398099805, 7.804715836445048, 3.531742920402508], "isController": false}, {"data": ["05 POST add cart", 4133, 4133, 100.0, 5.028550689571751, 0, 758, 1.0, 6.0, 16.0, 101.63999999999942, 22.169654447341035, 6.3867656855132875, 9.03243047006587], "isController": false}, {"data": ["06 GET cart", 4091, 4091, 100.0, 5.023221706184318, 0, 463, 1.0, 5.0, 16.0, 112.07999999999993, 22.082240286729064, 6.361582895102611, 4.205114117101727], "isController": false}, {"data": ["07 POST apply coupon", 4043, 0, 0.0, 12.994311155082876, 0, 1294, 2.0, 18.0, 48.0, 242.79999999999973, 21.828803438185016, 8.558575316930686, 7.189577200225145], "isController": false}, {"data": ["04 GET product detail", 4155, 0, 0.0, 10.121058965102282, 0, 1018, 1.0, 11.0, 35.0, 196.3199999999988, 22.238992902790713, 5.903275727049145, 3.550177940377554], "isController": false}, {"data": ["Flow A - Login Browse Cart Checkout", 4260, 4260, 100.0, 180.8572769953053, 0, 3482, 30.0, 228.0, 1288.3999999999978, 2749.3900000000003, 22.528716180483574, 59.83483734108265, 49.64756842072906], "isController": true}, {"data": ["09 GET my orders", 3962, 3962, 100.0, 5.067137809187274, 0, 648, 1.0, 5.0, 16.0, 103.0, 21.358375426547568, 6.153047608233917, 4.317562220014986], "isController": false}, {"data": ["01 POST login", 4222, 4222, 100.0, 11.47797252486972, 0, 1233, 3.0, 17.0, 41.0, 174.76999999999953, 22.386714317528657, 6.864676070023437, 5.520420395465922], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["401", 262, 1.0519131167944755, 0.7028274049036966], "isController": false}, {"data": ["403/Forbidden", 20385, 81.84446139639459, 54.683727667793335], "isController": false}, {"data": ["401/Unauthorized", 4222, 16.951057935520137, 11.325714898867965], "isController": false}, {"data": ["Response was null", 38, 0.1525675512908018, 0.1019367991845056], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 37278, 24907, "403/Forbidden", 20385, "401/Unauthorized", 4222, "401", 262, "Response was null", 38, "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["08 POST checkout", 4000, 4000, "403/Forbidden", 4000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["02 GET profile", 4199, 4199, "403/Forbidden", 4199, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["05 POST add cart", 4133, 4133, "403/Forbidden", 4133, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["06 GET cart", 4091, 4091, "403/Forbidden", 4091, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Flow A - Login Browse Cart Checkout", 300, 300, "401", 262, "Response was null", 38, "", "", "", "", "", ""], "isController": false}, {"data": ["09 GET my orders", 3962, 3962, "403/Forbidden", 3962, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["01 POST login", 4222, 4222, "401/Unauthorized", 4222, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
