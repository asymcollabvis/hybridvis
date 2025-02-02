import { Link, Node, IdList, TimelineData } from "../message";

export function computeTimelineData(
  roomTimelineData: TimelineData,
  links: Link[],
  nodes: Node[]
) {
  // find all the time nodes
  const timeNodes = nodes.filter((n) => n.dataType == "date");
  // find all the links that connect to time nodes
  const timeValueMap = {};
  links.forEach((link) => {
    const sourceNode = nodes.find((n) => n.id == `${link.source}`);
    const targetNode = nodes.find((n) => n.id == `${link.target}`);

    if (timeNodes.includes(sourceNode)) {
      timeValueMap[sourceNode.data] = timeValueMap[sourceNode.data] ?? [];
      timeValueMap[sourceNode.data].push(targetNode.id);
    } else if (timeNodes.includes(targetNode)) {
      timeValueMap[targetNode.data] = timeValueMap[targetNode.data] ?? [];
      timeValueMap[targetNode.data].push(sourceNode.id);
    }
  });

  const dataMap = roomTimelineData.data;
  Object.keys(timeValueMap).forEach((time) => {
    const prevData = dataMap[time] ?? ({ids: []} as IdList);
    prevData.ids = [...prevData.ids, ...timeValueMap[time]];
    dataMap[time] = prevData;
  });
  console.log("dataMap", roomTimelineData.data);
  
}
