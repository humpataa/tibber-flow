/**
	tibberflow Javascript
	needs just a little HTML, see here: https://github.com/humpataa/tibber-flow

	connects to Tibber API, subscribes to realtime websocket
	draws chart using chart.js
	
	uses Tibber demo token / homeid if nothing is provided

	very basic HTML / Javascript only
	websocket script based on: https://github.com/gulars/Tibber-Realtime-Kw-Meter
	chart script based on dynamic chart by jordanwillis: https://codepen.io/jordanwillis/pen/bqaGRR

	Questions? Ask me: admin@hopp.la
**/

// helper function to get average of values in array
const average = array => array.reduce((a, b) => a + b) / array.length;

// create initial empty chart
var ctx_live = document.getElementById("chart");

var tibberdata = [];

var myChart = new Chart(ctx_live, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      data: [],
      borderWidth: 1,
      borderColor:'#00c0ef',
      label: 'Watt',
      lineTension: 0.2,
    }]
  },
  options: {
    responsive: true,
    title: {
      display: true,
      text: "Tibber Pulse consumption / production chart",
    },
    legend: {
      display: false
    },
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true,
        }
      }],
      xAxes: [{
        ticks: {
	      fontSize: 10,
        }
      }]
    }
  }
});

// fill chart with empty data
for (i=0; i<100; i++) {
	myChart.data.labels.push("");
	myChart.data.datasets[0].data.push(0);
}

// Tibber websocket
const host = 'wss://websocket-api.tibber.com/v1-beta/gql/subscriptions';

// Tibber homeId
var homeId = '96a14971-525a-4420-aae9-e5aedaa129ff'			// demo

// Tibber token
var tibberToken = '5K4MVS-OjfWhK_4yrjOlFe1F6kJXPVf7eQYggo8ebAE'			// demo

const id = createId()

const options = {
	headers: {
	"User-Agent": window.navigator.userAgent
	}
};

// update chart data
var getData = function() {

	data = tibberdata;
	power = data.length > 0?average(data):0;
	tibberdata = [];

	myChart.data.labels.push(new Date().toLocaleTimeString());
	myChart.data.datasets[0].data.push(power);
	
	if (myChart.data.datasets[0].data.length > 100) {
		myChart.data.datasets[0].data.shift()
		myChart.data.labels.shift()
	}

	// render chart
	myChart.update();
};

function startStop() {
	
	var interval = document.getElementById("interval");
	interval = interval.value;
	
	document.getElementById('startstop').value = 'Stop!';

	if (document.getElementById('token').value != "") tibberToken = document.getElementById('token').value;
	if (document.getElementById('homeid').value != "") homeId = document.getElementById('homeid').value;

	if (typeof pusher !== 'undefined') {
		stopSocket();
		return;
	}
	
	ws = new WebSocket(host, 'graphql-transport-ws', options);
	
	ws.onopen = function(){
		json= '{"type":"connection_init","payload":{"token":"'+tibberToken+'"}}';
		ws.send(json)
	}
	
	ws.onmessage = function(msg) {
		//console.log(msg)
		reply = JSON.parse(msg.data)
		//console.log(msg.data)
	
		if (reply["type"] == "connection_ack") {
			console.log(reply["type"])
			query = '{"id": "'+id+'","type": "subscribe","payload": {"query": "subscription{liveMeasurement(homeId:\\\"'+homeId+'\\\"){timestamp power powerProduction}}"}}';
			ws.send(query);
		}
	
		if (reply["type"] == "next") {
			//console.log(reply["type"])
			tibberdata.push(reply["payload"]["data"]["liveMeasurement"]["power"] - reply["payload"]["data"]["liveMeasurement"]["powerProduction"])
		}
	}
	
	ws.addEventListener('error', (event) => {
		console.log('WebSocket error: ', event);
	});

	getData();

	if (typeof pusher !== 'undefined') clearInterval(pusher);
	pusher = setInterval(getData, interval * 1000);
}

function createId() {
    function _p8(s) {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}

function stopSocket() {
    try {
        query = '{"id": "'+id+'","type": "stop"}'
        ws.send(query)
        ws.close()
		console.log("Client stopped")
		display.innerHTML = 'Client stopped'
    } catch (e) {
        console.log("Stop error")
    }
    if (typeof pusher !== 'undefined') clearInterval(pusher);
}
