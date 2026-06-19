import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface StaticMapPreviewProps {
  originCoords: [number, number]; // [longitude, latitude]
  destCoords: [number, number]; // [longitude, latitude]
  width?: number;
  height?: number;
}

export default function StaticMapPreview({
  originCoords,
  destCoords,
  width = 300,
  height = 150,
}: StaticMapPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Setup an orthographic projection centered between the two points
    const centerLon = (originCoords[0] + destCoords[0]) / 2;
    const centerLat = (originCoords[1] + destCoords[1]) / 2;

    const projection = d3
      .geoMercator()
      .center([centerLon, centerLat])
      .scale(width * 1.5)
      .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    const originProjected = projection(originCoords);
    const destProjected = projection(destCoords);

    if (!originProjected || !destProjected) return;

    // Draw connecting line
    const link = {
      type: "LineString",
      coordinates: [originCoords, destCoords],
    };

    svg
      .append("path")
      .datum(link)
      .attr("d", pathGenerator as any)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4")
      .attr("class", "opacity-75");

    // Draw origin point
    svg
      .append("circle")
      .attr("cx", originProjected[0])
      .attr("cy", originProjected[1])
      .attr("r", 4)
      .attr("fill", "#10b981")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // Draw destination point
    svg
      .append("circle")
      .attr("cx", destProjected[0])
      .attr("cy", destProjected[1])
      .attr("r", 4)
      .attr("fill", "#f59e0b")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // Add labels
    svg
      .append("text")
      .attr("x", originProjected[0])
      .attr("y", originProjected[1] - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("fill", "#64748b")
      .attr("font-weight", "bold")
      .text("Origin");

    svg
      .append("text")
      .attr("x", destProjected[0])
      .attr("y", destProjected[1] - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("fill", "#64748b")
      .attr("font-weight", "bold")
      .text("Destination");
  }, [originCoords, destCoords, width, height]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center pointer-events-none">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      />
    </div>
  );
}
