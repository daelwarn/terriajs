import uniqBy from "lodash/uniqBy";
import { action, computed, observable } from "mobx";
import { observer } from "mobx-react";
import PropTypes from "prop-types";
import React from "react";
import {
  VictoryAxis,
  VictoryChart,
  VictoryLegend,
  VictoryLine,
  VictoryTheme
} from "victory";
import Styles from "./chart.scss";
import renderMomentLines from "./renderMomentLines";
import renderMomentPoints from "./renderMomentPoints";

const chartMinWidth = 110; // Required to prevent https://github.com/FormidableLabs/victory-native/issues/132

/**
 * A chart component that implements the charting behavior common to
 * FeatureInfoPanelChart & BottomDockChart. Presentation aspects are further
 * customized in the individual components.
 *
 */
@observer
class Chart extends React.Component {
  static propTypes = {
    width: PropTypes.number,
    height: PropTypes.number,
    domain: PropTypes.object,
    chartItems: PropTypes.array.isRequired,
    xAxis: PropTypes.object.isRequired,
    containerComponent: PropTypes.element,
    theme: PropTypes.object,
    renderLegends: PropTypes.func,
    renderXAxis: PropTypes.func,
    renderYAxis: PropTypes.func,
    renderLine: PropTypes.func
  };

  static defaultProps = {
    height: 110,
    theme: VictoryTheme.material,
    renderXAxis: label => <VictoryAxis label={label} />,
    renderYAxis: ({ label }, i) => (
      <VictoryAxis dependentAxis key={i} label={label} />
    ),
    renderLegends: (legends, width) => (
      <VictoryLegend
        x={width / 2}
        orientation="horizontal"
        data={legends}
        centerTitle={true}
      />
    )
  };

  @computed
  get yAxes() {
    return uniqBy(this.props.chartItems, ({ units }) => units).map(data => ({
      units: data.units,
      color: data.getColor()
    }));
  }

  @computed
  get legends() {
    return this.props.chartItems.map(({ name, getColor }) => {
      return {
        name,
        symbol: { fill: getColor(), type: "square" },
        labels: { fill: "white" }
      };
    });
  }

  renderLine(data, index) {
    return (
      <VictoryLine
        key={index}
        data={data.points.map(p => ({
          ...p,
          units: data.units,
          name: data.name
        }))}
        style={{
          data: { stroke: data.getColor() },
          labels: { fill: data.getColor() }
        }}
      />
    );
  }

  renderChartItem(chartItem, chartItems, index) {
    if (chartItem.type === "line") {
      const renderLine = this.props.renderLine || this.renderLine;
      return renderLine(chartItem, index);
    } else if (chartItem.type === "momentLines") {
      return renderMomentLines(chartItem, index);
    } else if (chartItem.type === "momentPoints") {
      return renderMomentPoints(chartItem, chartItems, index);
    }
  }

  renderChart(width, height) {
    if (!this.props.xAxis) {
      return null;
    }

    const hasData = this.props.chartItems.some(c => c.points.length > 0);
    if (hasData === false) {
      return (
        <div className={Styles.noData} style={{ height }}>
          No data available
        </div>
      );
    }
    return (
      <VictoryChart
        width={width}
        height={height}
        domain={this.props.domain}
        theme={this.props.theme}
        scale={this.props.xAxis.scale}
        containerComponent={this.props.containerComponent}
      >
        {this.props.renderLegends(this.legends, width)}
        {this.props.renderXAxis(this.props.xAxis.units)}
        <For each="yAxis" index="i" of={this.yAxes}>
          {this.props.renderYAxis(yAxis, i, this.yAxes.length)}
        </For>
        <For each="chartItem" index="i" of={this.props.chartItems}>
          {this.renderChartItem(chartItem, this.props.chartItems, i)}
        </For>
      </VictoryChart>
    );
  }

  render() {
    return (
      <Sized>
        {({ width: parentWidth }) =>
          this.renderChart(
            Math.max(chartMinWidth, this.props.width || parentWidth),
            this.props.height
          )
        }
      </Sized>
    );
  }
}

/**
 * A component that passes its width to its child component.
 */
@observer
class Sized extends React.Component {
  @observable containerElement = undefined;
  @observable width = 0;

  static propTypes = {
    children: PropTypes.func.isRequired
  };

  @action
  attachElement(el) {
    this.containerElement = el;
  }

  componentDidMount() {
    this.updateWidth();
    window.addEventListener("resize", this.updateWidth.bind(this));
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateWidth.bind(this));
  }

  @action
  updateWidth() {
    if (this.containerElement) {
      this.width = this.containerElement.getBoundingClientRect().width;
    }
  }

  render() {
    return (
      <div ref={this.attachElement.bind(this)}>
        {this.props.children({ width: this.width })}
      </div>
    );
  }
}

export default Chart;
