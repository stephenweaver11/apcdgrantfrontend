import * as d3 from 'd3';

class Sidebar {
	countiesSvg: any;
	professionsSvg: any;
	selectedProfessions: any;
	countiesHeaderSvg: any;

	constructor() {
		this.selectedProfessions = {};
		this.countiesSvg = d3.select('#counties')
			.append('svg')
			.attr('height', 1120)
			.attr("style","width:100%;")

		this.professionsSvg = d3.select('#professions')
			.append('svg')
			.attr('height', 1000)
			.attr("style","width:100%;")
		this.countiesHeaderSvg = d3.select('#countiesHeader')
			.append('svg')
			.attr('height', 50)
			.attr('width', 600)


	}

	initSideBar(selectedProfessions,currentYear, selectedCounty = 'State of Utah') {

		this.countiesSvg.selectAll('*').remove();
		this.countiesHeaderSvg.selectAll('*').remove();
		this.selectedProfessions = selectedProfessions;
		let barWidth: number = 120;
		let barHeight: number = 30;
		let mapData = (<HTMLInputElement>document.getElementById('mapData')).value;
		let domainMax;

		if (mapData.includes('100')) {
			domainMax = d3.max(Object.keys(currentYear), d => Math.max(currentYear[d]['totalSupplyPer100K'], currentYear[d]['totalDemandPer100K']));
		} else {
			domainMax = d3.max(Object.keys(currentYear), d => Math.max(currentYear[d]['totalSupply'], currentYear[d]['totalDemand']));
		}

		var headers = [{name: 'County', x: 0},
		{name: 'Supply', x: barWidth},
		{name: 'Need', x: 2 * barWidth},
		{name: 'Gap', x: 3 * barWidth}];
		this.totalSupplyDemandByCounty(currentYear);
		var xScale = d3.scaleLinear()
		.domain([0, domainMax])
		.range([0, barWidth]);
		let countiesData = [];
		for (let county in currentYear) {
			let d = currentYear[county];
			if (mapData.includes('100')) {
				countiesData.push([county, d.totalSupplyPer100K, d.totalDemandPer100K, d.totalDemandPer100K - d.totalSupplyPer100K]);
			} else {
				countiesData.push([county, d.totalSupply, d.totalDemand, d.totalDemand - d.totalSupply]);
			}
		};
		var sortingFunction = this.getSortingOptions(0, true);

		var groups = this.countiesSvg.append('g')
			.selectAll('g')
			.data(countiesData.sort(sortingFunction))
			.enter()
			.append('g')
			.attr('transform', (d, i) => `translate(0, ${i * barHeight})`);

		groups.append('rect')
			.attr('width', 4 * barWidth)
			.attr('height', barHeight)
			.attr('fill', (d) => d[0] == selectedCounty ? '#cccccc' : 'none')

		var groupsHeaders = this.countiesHeaderSvg
			.append('g')
			.attr('id', 'sortCounties')
			.selectAll('g')
			.data(headers)
			.enter()
			.append('g')

		groupsHeaders.call(this.drawHeaders);
		var axis = this.countiesHeaderSvg.append('g');

		var xAxis = g => g
			.attr("transform", `translate(${3*barWidth},${45})`)
			.call(d3.axisTop(xScale).ticks(4).tickSize(1.5).tickFormat(d3.format(".1s")))
		axis.call(xAxis);

		groups.call(this.drawText);
		groups.call(this.drawText, 1,  50+barWidth);
		groups.call(this.drawText, 2,  2 * barWidth);
		if (mapData.includes('100')) {
			groups.call(this.draw1DScatterPlot, xScale, 3*barWidth, 1, 2, d3.interpolatePuOr(0), d3.interpolatePuOr(1));
		} else {
			groups.call(this.draw1DScatterPlot, xScale, 3 * barWidth, 1, 2);
		}
		var countiesSortDirection = [true];

		d3.select('#sortCounties')
		.selectAll('g')
		.on('click', (d, i) => {
			countiesSortDirection[i] = !countiesSortDirection[i];
			const sortingFunction = this.getSortingOptions(i, countiesSortDirection[i]);

			groups.sort(sortingFunction)
				.transition()
				.delay(function(d, i) {
					return i * 50;
				})
				.duration(1000)
				.attr("transform", function(d, i) {
					let y = i * barHeight;
					return "translate(" + 0 + ", " + y + ")";
				});
		});


		this.professionsSvg.selectAll('*').remove();
		var professions = Object.keys(currentYear[selectedCounty]['supply']);
		var population = currentYear[selectedCounty]['population'];
		var stats = {}

		for (let prof of professions) {
				stats[prof] = {totalDemandPer100K:0,totalSupplyPer100K:0,totalSupply: 0, totalDemand: 0};
			}

		const f = d3.format('.0f');
		for (let prof of professions) {
			stats[prof].totalSupply += currentYear[selectedCounty]['supply'][prof];
			stats[prof].totalDemand += currentYear[selectedCounty]['demand'][prof];
			stats[prof].totalSupplyPer100K = Number(f(stats[prof].totalSupply / population * 100000));
			stats[prof].totalDemandPer100K = Number(f(stats[prof].totalDemand / population * 100000));
		}
	//}

	var data = Object.keys(stats).map(d => {
		if (mapData.includes('100')) {
		return [stats[d].totalSupplyPer100K, stats[d].totalDemandPer100K, stats[d].totalDemandPer100K - stats[d].totalSupplyPer100K];
		} else {
		return [stats[d].totalSupply, stats[d].totalDemand, stats[d].totalDemand- stats[d].totalSupply];
		}
	});
	var xScale = d3.scaleLinear()
		.domain([0, d3.max(data, (d) => d3.max(d))])
		.range([0, barWidth])

	var professionsData = [];

	for (let i in data) {
			professionsData.push([professions[i], ...data[i]]);
	};

	sortingFunction = this.getSortingOptions(0, true);

	var professionsGroups = this.professionsSvg.append('g')
		.selectAll('g')
		.data(professionsData.sort(sortingFunction))
		.enter()
		.append('g')
		.attr('transform', (d, i) => `translate(0, ${i * barHeight + 1.4 * barHeight })`);

	professionsGroups.append('rect')
		.attr('width', 4 * barWidth)
		.attr('height', barHeight - 4)
		.attr('fill', (d) => {
			if (!this.selectedProfessions.hasOwnProperty(d[0])
				|| this.selectedProfessions[d[0]]) {
				return '#cccccc';
			}
			return '#ffffff';
		})
		.attr('fill-opacity', 0.8)


	professionsGroups.on('click', (d, i ,j)=> {
		if (!this.selectedProfessions.hasOwnProperty(d[0])
				|| this.selectedProfessions[d[0]]) {
				this.selectedProfessions[d[0]] = false;
				d3.select("#" + d[0])
					.select('rect')
					.attr('fill', '#ffffff');
			} else {
				this.selectedProfessions[d[0]] = true;
				d3.select("#" + d[0])
					.select('rect')
					.attr('fill', '#cccccc');
			}
	})


	var professionsHeaders = this.professionsSvg
		.append('g')
		.attr('id', 'sortProfessions')
		.selectAll('g')
		.data(headers)
		.enter()
		.append('g')

	headers[0].name = 'Profession';
	professionsHeaders.call(this.drawHeaders);
	var axis = this.professionsSvg.append('g');

	var xAxis = g => g
		.attr("transform", `translate(${3*barWidth},${42})`)
		.call(d3.axisTop(xScale).ticks(4).tickSize(1.5).tickFormat(d3.format(".1s")))
	axis.call(xAxis);

	professionsGroups.call(this.drawText);

	professionsGroups.call(this.drawText, 1,  barWidth);
	professionsGroups.call(this.drawText, 2,  2 * barWidth);
	if (mapData.includes('100')) {
		professionsGroups.call(this.draw1DScatterPlot, xScale, 3*barWidth, 1, 2, d3.interpolatePuOr(0), d3.interpolatePuOr(1));
	} else {
		professionsGroups.call(this.draw1DScatterPlot, xScale, 3 * barWidth, 1, 2);
	}
	var professionsSortDirection = [true];
	d3.select('#sortProfessions')
		.selectAll('g')
		.on('click', (d, i) => {
			professionsSortDirection[i] = !professionsSortDirection[i];
			const sortingFunction = this.getSortingOptions(i, professionsSortDirection[i]);

			professionsGroups.sort(sortingFunction)
				.transition()
				.delay(function(d, i) {
					return i * 50;
				})
				.duration(1000)
				.attr("transform", function(d, i) {
					let y = i * barHeight + 1.4 * barHeight;
					return "translate(" + 0 + ", " + y + ")";
				});
		});
	}

	draw1DScatterPlot(svg, xScale, x = 0, i = 0, j = 1, iColor = '#086fad', jColor = '#c7001e') {
		let barWidth: number = 120;
		let barHeight: number = 30;	
		const radius = 6;
		
			var xAxis = g => g
				.attr("transform", `translate(${barWidth},${20})`)
				.call(d3.axisTop(xScale).ticks(4).tickSize(1.5).tickFormat(d3.format(".1s")))
		
			var groups = svg.append('g');
			groups
				.append('line')
				.attr('stroke', '#000000')
				.attr('x1', x)
				.attr('x2', x + barWidth)
				.attr('y1', (d, i) => 0 * barHeight + barHeight / 2)
				.attr('y2', (d, i) => 0 * barHeight + barHeight / 2)
		
			groups
				.append('rect')
				.attr('height', 6)
				.attr('width', d => Math.abs(xScale(d[i]) - xScale(d[j])))
				.attr('x', d => {return x + xScale(d3.min([d[i], d[j]]))})
				.attr('y', (d, i) => 0 * barHeight + barHeight / 2 - radius / 2)
				.attr('fill', d => d[i] > d[j] ? iColor : jColor);
		
			groups
				.append('circle')
				.attr('r', 6)
				.attr('stroke', iColor)
				.attr('fill', iColor)
				.attr('cx', d => x + xScale(d[i]))
				.attr('cy', (d, i) => 0 * barHeight + barHeight / 2)
				.append('title')
				.text(d => d[i])
		
			groups
				.append('circle')
				.attr('r', 6)
				.attr('stroke', jColor)
				.attr('fill', jColor)
				.attr('cx', d => x + xScale(d[j]))
				.attr('cy', (d, i) => 0 * barHeight + barHeight / 2)
				.append('title')
				.text(d => d[j])
		}
	
	totalSupplyDemandByCounty(currentYear) {
		let barWidth: number = 120;
		let barHeight: number = 30;
		for (let county in currentYear) {
			let totalSupply = d3.sum(Object.keys(currentYear[county]['supply']).map(d => currentYear[county]['supply'][d]));
			let totalDemand = d3.sum(Object.keys(currentYear[county]['demand']).map(d => currentYear[county]['demand'][d]));
			currentYear[county]['totalSupply'] = totalSupply;
			currentYear[county]['totalDemand'] = totalDemand;
		}
	}
	
	drawHeaders(groups, i = 0, dx = 0, dy = 0) {
		
		let barWidth: number = 120;
		let barHeight: number = 30;
		groups
			.append('rect')
			.attr('height', barHeight)
			.attr('width', barWidth)
			.attr('x', (d, i) => d.x)
			.attr('fill', '#aabbcc')
	
		groups
			.append('text')
			.attr('font-weight', 'bold')
			.attr('y', (d, i) => 0 * barHeight + barHeight / 2 + 5 + dy)
			.attr('x', (d, i) => d.x)
			.text(d => d.name);
	}

	// drawStackedBar(svg, data, xScale) {
	// 	let barWidth: number = 120;
	// 	let barHeight: number = 30;
	// 	xScale = function (d) {
	// 		return barWidth * d[0] / (d[0] + d[1]) || 0;
	// 	}
	// 	var groups = svg.append('g')
	// 		.selectAll('g')
	// 		.data(data)
	// 		.enter()
	// 		.append('g');

	// 	groups
	// 		.append('rect')
	// 		.attr('width', d => xScale(d))
	// 		.attr('height', barHeight - 4)
	// 		.attr('x', barWidth)
	// 		.attr('y', (d, i) => i * barHeight - 2)
	// 		.attr('fill', '#086fad')
	// 		.append('title')
	// 		.text(d => d[0])

	// 	groups
	// 		.append('rect')
	// 		.attr('width', d => barWidth - xScale(d))
	// 		.attr('height', barHeight - 4)
	// 		.attr('x', d => barWidth + xScale(d))
	// 		.attr('y', (d, i) => i * barHeight - 2)
	// 		.attr('fill', '#c7001e')
	// 		.append('title')
	// 		.text(d => d[1])
	// }

	drawText(selection, i = 0, dx = 0, dy = 0) {
		let barWidth: number = 120;
		let barHeight: number = 30;
		var groups = selection.append('g');
	
		const f = d3.format('.0f');
	
		groups
			.append('text')
			.attr('y', (d, i) => 0 * barHeight + barHeight / 2 + 5 + dy)
			.attr('x', dx)
			.text(d => isNaN(d[i]) ? d[i] : f(d[i]));
	}
	

	getSortingOptions(index, ascending) {

		if (ascending) {
			const sortingFunction = function(a, b) {
				return d3.ascending(a[index], b[index]);
			}
			return sortingFunction;
		} else {
			const sortingFunction = function(a, b) {
				return d3.descending(a[index], b[index]);
			}
			return sortingFunction;
		}
	}
}

export { Sidebar };
