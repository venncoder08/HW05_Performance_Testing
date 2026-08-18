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

    var data = {"OkPercent": 99.96769103614096, "KoPercent": 0.03230896385904275};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.7534605299709336, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.789031417204006, 500, 1500, "08 POST checkout"], "isController": false}, {"data": [0.791621875839828, 500, 1500, "02 GET profile"], "isController": false}, {"data": [0.7928744775515707, 500, 1500, "03 GET categories"], "isController": false}, {"data": [0.9918494871969028, 500, 1500, "05 POST add cart"], "isController": false}, {"data": [0.9928464368442567, 500, 1500, "06 GET cart"], "isController": false}, {"data": [0.6318576210972193, 500, 1500, "07 POST apply coupon"], "isController": false}, {"data": [0.7918302423175849, 500, 1500, "04 GET product detail"], "isController": false}, {"data": [0.19376124775044992, 500, 1500, "Flow A - Login Browse Cart Checkout"], "isController": true}, {"data": [0.7901459854014599, 500, 1500, "09 GET my orders"], "isController": false}, {"data": [0.7790441176470588, 500, 1500, "01 POST login"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 133090, 43, 0.03230896385904275, 444.9510406491888, 0, 14274, 907.0, 1420.0, 1635.0, 5163.870000000021, 290.0082367656095, 245.5268573817926, 92.96043901089084], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["08 POST checkout", 14578, 0, 0.0, 449.9982164906029, 7, 2226, 400.0, 924.0, 1010.0, 1144.2099999999991, 32.05407283297493, 9.867839031242717, 16.697463576916142], "isController": false}, {"data": ["02 GET profile", 14884, 0, 0.0, 445.6468691212029, 3, 2256, 396.0, 923.0, 1013.75, 1151.0, 32.496610387824035, 15.07775511402961, 10.148090675400695], "isController": false}, {"data": ["03 GET categories", 14834, 0, 0.0, 438.414251044897, 1, 2268, 387.0, 913.0, 1005.0, 1147.6499999999996, 32.4154704438826, 11.33275236221677, 5.128228722567365], "isController": false}, {"data": ["05 POST add cart", 14723, 0, 0.0, 195.79515044488107, 2, 1461, 173.0, 408.60000000000036, 450.0, 523.0, 32.23249958951344, 9.25425281183296, 16.30415215710689], "isController": false}, {"data": ["06 GET cart", 14678, 0, 0.0, 196.56288322659765, 2, 1495, 176.0, 403.0, 444.0, 517.0, 32.194173990669434, 46.28831410074333, 9.927880272157896], "isController": false}, {"data": ["07 POST apply coupon", 14637, 0, 0.0, 757.4427136708354, 2, 2385, 675.0, 1542.0, 1662.0, 1857.0, 32.133848224262955, 12.599054307098118, 10.584102638495855], "isController": false}, {"data": ["04 GET product detail", 14774, 0, 0.0, 443.78150805469136, 1, 2230, 392.0, 924.0, 1007.0, 1135.0, 32.3408242159966, 17.11677702146569, 5.16278683902045], "isController": false}, {"data": ["Flow A - Login Browse Cart Checkout", 15003, 43, 0.2866093447977071, 3868.120509231485, 0, 14274, 3269.0, 8072.0, 8370.8, 8763.96, 32.64900201077637, 242.09871714739057, 91.57148892114449], "isController": true}, {"data": ["09 GET my orders", 14522, 0, 0.0, 446.36186475692125, 3, 2225, 394.0, 927.0, 1010.0, 1146.7700000000004, 31.939999780057843, 101.45056791470093, 10.22376622760714], "isController": false}, {"data": ["01 POST login", 14960, 0, 0.0, 488.1482620320851, 4, 2293, 413.0, 1065.0, 1194.0, 1375.0, 32.6363209965422, 21.06354459815439, 8.047856281428276], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Response was null", 43, 100.0, 0.03230896385904275], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 133090, 43, "Response was null", 43, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Flow A - Login Browse Cart Checkout", 500, 43, "Response was null", 43, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
