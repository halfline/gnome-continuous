/* This module implements a graph that shows the dependencies between
 * the components. Instead of using SVG or something like that, the
 * graph is done as fixed-width text and box-drawing characters with
 * CSS layered on top to make it look reasonable.
 *
 * Having this work depends on having a fixed-width font with bold
 * box-drawing characters. 'DejaVu Sans Mono' is a freely available
 * such font; an appropriate subset of it is included here and specified
 * in the CSS as a fallback.
 *
 * Copyright: Red Hat, Inc. 2016
 * Author: Owen Taylor <otaylor@fishsoup.net>
 * License: MIT
 */
(function(exports) {
    'use strict';

    var bgoDepGraph = angular.module('bgoDepGraph', []);

    var CONN_RL = "\u2501\u2501\u2501";
    var CONN_RL_SINGLE = "\u2501";
    var CONN_RBL = "\u2501\u2533\u2501";
    var CONN_TB = "\u00a0\u2503\u00a0";
    var CONN_TR = "\u00a0\u2517\u2501";
    var CONN_TRD = "\u00a0\u2523\u2501";
    var CONN_NONE = "\u00a0\u00a0\u00a0";
    var CONN_NONE_SINGLE = "\u00a0";

    function DepGraph(taskRoots, taskChildren) {
        this.taskRoots = taskRoots;
        this.taskChildren = taskChildren;
        this.connectors = [];
        this.cells = [];
        this.columnWidths = [];
        this.nRows = 0;
        this.nColumns = 0;

        var i;
        for (i = 0; i < this.taskRoots.length; i++)
            this._findColumnWidth(this.taskRoots[i], 0);

        this.columnHeights = new Array(this.nColumns);
        for (i = 0; i < this.nColumns; i++)
            this.columnHeights[i] = 0;

        for (i = 0; i < this.taskRoots.length; i++)
            this._place(this.taskRoots[i], 0, 0);
    }

    DepGraph.prototype._findColumnWidth = function(task, depth) {
        if (depth >= this.nColumns) {
            this.columnWidths.push(task.length);
            this.nColumns++;
        } else {
            this.columnWidths[depth] = Math.max(this.columnWidths[depth], task.length);
        }
        var children = this.taskChildren[task];
        for (var i = 0; i < children.length; i++)
            this._findColumnWidth(children[i], depth + 1);
    }

    DepGraph.prototype._place = function(task, depth, parentY) {
        var children = this.taskChildren[task];
        var ypos = Math.max(parentY, this.columnHeights[depth]);
        if (children.length > 0) {
            ypos = this._place(children[0], depth + 1, ypos);
            this.connectors[ypos][depth] = (children.length == 1) ? LR: CONN_RBL;
        }

        this.columnHeights[depth] = ypos + 1;
        var connectorPos = ypos + 1;
        for (var i = 1; i < children.length; i++) {
            var newY = this._place(children[i], depth + 1, ypos);
            while (connectorPos < newY)
                this.connectors[connectorPos++][depth] = CONN_TB;
            this.connectors[connectorPos++][depth] = (children.length == i + 1) ? CONN_TR : CONN_TRD;
        }

        if (ypos + 1 >= this.nRows) {
            this.cells.push(new Array(this.nColumns));
            this.connectors.push(new Array(this.nColumns));
            this.nRows++;
        }
        this.cells[ypos][depth] = task;

        return ypos;
    }

    function _repeat(str, width) {
        var res = "";
        for (var i = 0; i < width; i++)
            res += str;
        return res;
    }

    DepGraph.prototype.update = function(element, taskStates) {
        // Not supported in angularjs-1.2 jqLite
        // element.empty();
        var e = element[0];
        while (e.lastChild)
            e.removeChild(e.lastChild);

        var i, j;

        var output = "";
        for (j = 0; j < this.nRows; j++) {
            var row = this.cells[j];
            var rowConnectors = this.connectors[j];
            for (i = 0; i < this.nColumns; i++) {
                var pad;
                var span = document.createElement("span");
                if (row[i] !== undefined) {
                    span.appendChild(document.createTextNode(row[i]));
                    if (row[i] in taskStates)
                        span.className = "graph-task " + "graph-" + taskStates[row[i]];
                    else
                        span.className = "graph-task";
                    pad = this.columnWidths[i] - row[i].length;
                } else {
                    span.appendChild(document.createTextNode(_repeat(" ", this.columnWidths[i])));
                    span.className = "graph-hidden";
                    pad = 0;
                }
                element.append(span);
                if (pad > 0) {
                    var padSpan = document.createElement("span");
                    padSpan.className = "graph-pad";
                    if (rowConnectors[i] == CONN_RL || rowConnectors[i] == CONN_RBL)
                        padSpan.appendChild(document.createTextNode(_repeat(CONN_RL_SINGLE, pad)));
                    else
                        padSpan.appendChild(document.createTextNode(_repeat(CONN_NONE_SINGLE, pad)));
                    element.append(padSpan);
                }
                var connector = rowConnectors[i] !== undefined ? rowConnectors[i] : CONN_NONE;
                var connectorSpan = document.createElement("span");
                connectorSpan.className = 'graph-connector';
                connectorSpan.appendChild(document.createTextNode(connector));
                element.append(connectorSpan);
            }
            element.append(document.createTextNode("\n"));
            if (j != this.nRows - 1) {
                var rowSpan = document.createElement("span");
                rowSpan.className = "graph-inter-row";
                for (i = 0; i < this.nColumns; i++) {
                    var span = document.createElement("span");
                    span.appendChild(document.createTextNode(_repeat(CONN_NONE_SINGLE, this.columnWidths[i])));
                    span.className = "graph-hidden";
                    rowSpan.appendChild(span);
                    var connector;
                    if (rowConnectors[i] == CONN_TB || rowConnectors[i] == CONN_RBL || rowConnectors[i] == CONN_TRD)
                        connector = CONN_TB;
                    else
                        connector = CONN_NONE;
                    var connectorSpan = document.createElement("span");
                    connectorSpan.className = 'graph-connector';
                    connectorSpan.appendChild(document.createTextNode(connector));
                    rowSpan.appendChild(connectorSpan);
                }
                rowSpan.appendChild(document.createTextNode("\n"));
                element.append(rowSpan);
            }
        }
    }

    var graph = new DepGraph(["resolve"],
                             {
                                 resolve: ["build", "bdiff"],
                                 build: ["builddisks", "zdisks"],
                                 bdiff: [],
                                 builddisks: ["smoketest", "smoketest-classic", "smoketest-wayland", "smoketest-timed"],
                                 zdisks: [],
                                 smoketest: ["applicationstest", "integrationtest", "memusage"],
                                 'smoketest-classic': [],
                                 'smoketest-wayland': [],
                                 'smoketest-timed': [],
                                 applicationstest: [],
                                 integrationtest: [],
                                 memusage: []
                             });

    bgoDepGraph.directive('depGraph', function() {
        function link(scope, element, attrs) {
            var taskStates;

            function updateGraph() {
                graph.update(element, taskStates);
            }

            scope.$watch(attrs.depGraph, function(value) {
                taskStates = value;
                updateGraph();
            }, true);
        }

        return {
            link: link
        };
    });
})(window);

