require('./lib/flowchart.shim');
var parse = require("./lib/flowchart.parse");
require("./lib/jquery-plugin");

var FlowChart = {
	parse: parse
};

if (typeof window !== 'undefined') {
	window.flowchart = FlowChart;
}

module.exports = FlowChart;
