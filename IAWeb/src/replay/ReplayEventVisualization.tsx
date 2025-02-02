import { width, margin, height } from "@mui/system";
import * as d3 from "d3";
import React, { useCallback, useMemo, useRef } from "react";
import { useEffect } from "react";
import { selectReplayData } from "../features/replay/replaySlice";
import { useAppSelector } from "../hooks";
import { EventType } from "../../server/common";
export default function ReplayEventVisualization({ replayData, colorScale }) {
  console.log("ReplayEventVisualization");

  const selector = useAppSelector;
  // const replayData = selector(selectReplayData);
  const yAxisRef = useRef<SVGGElement>(null!);
  const xAxisRef = useRef<SVGGElement>(null!);
  const svgRef = useRef<SVGSVGElement>(null!);
  const foucsRef = useRef<SVGGElement>(null!);
  const gRef = useRef<SVGGElement>(null!);
  const xAxisContextRef = useRef<SVGGElement>(null!);

  let width = 1000;
  let height = 100;
  let focusHeight = 10;
  const margin = { top: 20, right: 20, bottom: 30, left: 100 };

  const timeScale = useMemo(
    () =>
      d3
        .scaleTime()
        .domain(d3.extent(replayData.map((d) => d.timestamp)))
        .range([0, width]),
    [replayData]
  );

  const defaultSelection = useMemo(
    () => [timeScale.range()[0], timeScale.range()[1]],
    [timeScale]
  );

  // const [selection, setSelection] = React.useState<any>(null);
  // const focusData = useMemo(() => {
  //   if (!replayData) return;

  //   let focusDomain;
  //   if (!selection) {
  //     focusDomain = defaultSelection.map(timeScale.invert, timeScale);
  //   } else {
  //     focusDomain = selection.map(timeScale.invert, timeScale);
  //   }

  //   return replayData.filter((d) => {
  //     return d.timestamp >= focusDomain[0] && d.timestamp <= focusDomain[1];
  //   });
  // }, [selection, defaultSelection]);

  const foucsTimeScaleRef = useRef<d3.ScaleTime<number, number, never>>(null!);

  // const focusTimeScale = useMemo(() => {
  //   let focusDomain;
  //   if (!selection) {
  //     focusDomain = defaultSelection.map(timeScale.invert, timeScale);
  //   } else {
  //     focusDomain = selection.map(timeScale.invert, timeScale);
  //   }
  //   return d3.scaleTime().domain(focusDomain).range([0, width]);
  // }, [selection, defaultSelection]);

  const eventScale = useMemo(
    () =>
      d3
        .scalePoint()
        .domain(replayData.map((d) => EventType[d.event]))
        .range([0, height]),
    [replayData]
  );

  function update() {
    if (!foucsTimeScaleRef.current) return;

    const xAxis = d3.axisBottom(foucsTimeScaleRef.current);
    d3.select(xAxisRef.current).call(xAxis);

    if (gRef.current) {
      d3.select(gRef.current)
        .selectAll("g")
        .attr("transform", (d) => {
          return `translate(${foucsTimeScaleRef.current(
            d.timestamp
          )},${eventScale(EventType[d.event])})`;
        });
    }
  }

  const brushended = useCallback(
    ({ selection }) => {
      if (!foucsRef.current) return;
      const focus = d3.select(foucsRef.current);

      let focusDomain;
      if (!selection) {
        focus.call(brush.move, defaultSelection);
        focusDomain = defaultSelection.map(timeScale.invert, timeScale);
      } else {
        focusDomain = selection.map(timeScale.invert, timeScale);
      }

      foucsTimeScaleRef.current = d3
        .scaleTime()
        .domain(focusDomain)
        .range([0, width]);

      update();
    },
    [defaultSelection]
  );

  const brush = useMemo(() => {
    return d3
      .brushX()
      .extent([
        [0, -focusHeight],
        [width, focusHeight],
      ])
      .on("end", brushended);
  }, [brushended]);

  useEffect(() => {
    if (!foucsRef.current) return;
    d3.select(foucsRef.current).call(brush).call(brush.move, defaultSelection);
    update();
  }, [defaultSelection]);

  useEffect(() => {
    // draw axis
    const yAxis = d3.axisLeft(eventScale);
    d3.select(yAxisRef.current).call(yAxis);

    const xAxisContext = d3.axisBottom(timeScale);
    d3.select(xAxisContextRef.current).call(xAxisContext);

    if (!foucsTimeScaleRef.current) return;
    const xAxis = d3.axisBottom(foucsTimeScaleRef.current);
    d3.select(xAxisRef.current).call(xAxis);
  }, [eventScale]);

  useEffect(() => {
    let g = d3
      .select(gRef.current)
      .selectAll("g")
      .data(replayData)
      .enter()
      .append("g");
    g.append("circle")
      .datum((d) => d)
      .attr("r", 5)
      .attr("fill", (d) => colorScale(d.event));
  }, []);

  function drawVisualization() {
    if (!replayData) return;

    if (replayData.length === 0) {
      return;
    }

    // console.log(timeScale, colorScale, eventScale);

    return (
      <>
        <g
          ref={gRef}
          transform={`translate(${margin.left},${margin.top})`}
          clipPath="url(#clip)"
        ></g>
        <g
          ref={foucsRef}
          transform={`translate(${margin.left},${
            margin.top + margin.bottom + height + margin.top
          })`}
        >
          {replayData.map((d, i) => {
            return (
              <g key={i} transform={`translate(${timeScale(d.timestamp)},0)`}>
                <circle r={5} fill={"black"} />
              </g>
            );
          })}
        </g>
      </>
    );
  }

  return (
    <svg
      ref={svgRef}
      width={width + margin.left + margin.right}
      height={
        height +
        margin.top +
        margin.bottom +
        focusHeight +
        margin.bottom +
        margin.top
      }
    >
      <defs>
        <clipPath id="clip">
          <rect width={width} height={height}></rect>
        </clipPath>
      </defs>
      <g
        ref={xAxisRef}
        transform={`translate(${margin.left},${height + margin.top})`}
      />
      <g ref={yAxisRef} transform={`translate(${margin.left},${margin.top})`} />
      {drawVisualization()}
      <g
        ref={xAxisContextRef}
        transform={`translate(${margin.left},${
          margin.top + margin.bottom + height + margin.top
        })`}
      />
    </svg>
  );
}
