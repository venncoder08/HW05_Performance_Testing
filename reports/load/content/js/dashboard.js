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

    var data = {"OkPercent": 100.0, "KoPercent": 0.0};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [1.0, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "08 POST checkout"], "isController": false}, {"data": [1.0, 500, 1500, "02 GET profile"], "isController": false}, {"data": [1.0, 500, 1500, "03 GET categories"], "isController": false}, {"data": [1.0, 500, 1500, "05 POST add cart"], "isController": false}, {"data": [1.0, 500, 1500, "06 GET cart"], "isController": false}, {"data": [1.0, 500, 1500, "07 POST apply coupon"], "isController": false}, {"data": [1.0, 500, 1500, "04 GET product detail"], "isController": false}, {"data": [1.0, 500, 1500, "Flow A - Login Browse Cart Checkout"], "isController": true}, {"data": [1.0, 500, 1500, "09 GET my orders"], "isController": false}, {"data": [1.0, 500, 1500, "01 POST login"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 4500, 0, 0.0, 8.160888888888891, 1, 122, 6.0, 15.0, 19.0, 30.0, 33.1704296676323, 13.877347383774499, 10.612421151124476], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["08 POST checkout", 500, 0, 0.0, 16.428000000000008, 5, 93, 15.0, 23.900000000000034, 27.0, 48.930000000000064, 4.126638275395332, 1.2645244771549304, 2.149607788823413], "isController": false}, {"data": ["02 GET profile", 500, 0, 0.0, 8.125999999999998, 2, 50, 7.0, 12.0, 16.0, 24.0, 4.154894465680571, 1.927781766764999, 1.2975037523890642], "isController": false}, {"data": ["03 GET categories", 500, 0, 0.0, 5.104, 1, 86, 4.0, 8.0, 12.0, 32.91000000000008, 4.155516031980851, 1.4528073627433054, 0.6574156222469706], "isController": false}, {"data": ["05 POST add cart", 500, 0, 0.0, 6.149999999999997, 2, 28, 5.5, 9.0, 10.0, 17.980000000000018, 4.165937627581839, 1.196079748544005, 2.1831872781638215], "isController": false}, {"data": ["06 GET cart", 500, 0, 0.0, 5.7400000000000055, 2, 58, 5.0, 8.0, 10.0, 16.980000000000018, 4.146143257541834, 1.4003922769789543, 1.2785750249805132], "isController": false}, {"data": ["07 POST apply coupon", 500, 0, 0.0, 7.146000000000002, 3, 122, 5.0, 11.0, 16.0, 28.0, 4.151685999684472, 1.6277528272981656, 1.3674453586226365], "isController": false}, {"data": ["04 GET product detail", 500, 0, 0.0, 5.247999999999998, 1, 46, 4.0, 10.0, 14.0, 29.99000000000001, 4.171255047218607, 2.200939914113859, 0.6654699726991358], "isController": false}, {"data": ["Flow A - Login Browse Cart Checkout", 500, 0, 0.0, 73.44799999999995, 46, 181, 70.0, 93.80000000000007, 108.89999999999998, 141.92000000000007, 4.181546001187559, 15.744713088448062, 12.040451361302301], "isController": true}, {"data": ["09 GET my orders", 500, 0, 0.0, 8.72399999999999, 3, 99, 7.0, 13.0, 17.0, 45.92000000000007, 4.1612916649327945, 1.8945661983479671, 1.332011581394865], "isController": false}, {"data": ["01 POST login", 500, 0, 0.0, 10.78200000000001, 5, 76, 10.0, 16.0, 19.0, 30.0, 4.176237210273544, 2.6953532835665066, 1.0298258378575904], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": []}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 4500, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
