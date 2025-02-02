import { addLink, addNode, clearNodeSelection, updateNode } from "./graph";
import { useAppDispatch, useAppSelector } from "../hooks";
import store from "../store";
import { useDocumentStore, useDocumentsStore, useGraphStore, useTimelineStore } from "../stores/store";

export default function useDragToAddNode() {
  const dispatch = useAppDispatch();
  const setSelectedText = useDocumentStore((state) => state.setSelectedText);
  // const addData = useTimelineStore((state) => state.addData);

  function dragToAddNode() {
    const position = store.getState().graph.toBeCreatedNodePosition;
    const _user = store.getState().user.userInfo;
    if (!_user) {
      return;
    }
    
    const _selectedText = useDocumentStore.getState().selectedText;
    if (_selectedText === "") {
      console.warn("no text selected, but want to create node or link");
      
      return;
    }
    let _documentIndex = useDocumentStore.getState().from;
    if (_documentIndex == -1 || _documentIndex == undefined) {
      _documentIndex = useDocumentsStore.getState().documentId.id;
    }
    const _selectedNodeIds = useGraphStore.getState().selectedNodeIds;
    const _documentId =
      store.getState().document.documents[_documentIndex].fileName;
    if (_selectedText != "") {
      // handle drag text to canvas
      console.log("drag text to canvas. Text:", _selectedText);

      if (_selectedNodeIds.length == 2) {
        // create a link
        addLink(
          _user,
          _selectedNodeIds[0],
          _selectedNodeIds[1],
          _selectedText,
          _documentId
        );

        // add timeline data if one of the node is a time node
        // const targetNode1 = store
        //   .getState()
        //   .graph.nodesRaw.find(
        //     (node) => node.getId() == `${_selectedNodeIds[0]}`
        //   );
        // const targetNode2 = store
        //   .getState()
        //   .graph.nodesRaw.find(
        //     (node) => node.getId() == `${_selectedNodeIds[1]}`
        //   );

        // console.log("targetNode1:", targetNode1?.toObject());
        // console.log("targetNode2:", targetNode2?.toObject());

        // if (targetNode1 && targetNode1.getDatatype() == "date") {
        //   addData({
        //     date: targetNode1.getData(),
        //     values: [`${_selectedNodeIds[1]}`],
        //   });
        // } else if (targetNode2 && targetNode2.getDatatype() == "date") {
        //   addData({
        //     date: targetNode2.getData(),
        //     values: [`${_selectedNodeIds[0]}`],
        //   });
        // }
      } else if (_selectedNodeIds.length == 1) {
        // update node
        updateNode(_user, _selectedText);
      } else {
        // set data type to time if the _selectedText is a date
        const _date = new Date(_selectedText);
        let dataType;
        if (!isNaN(_date.getTime())) {
          dataType = "date";
          console.log("date:", _date);
          
        }

        // create a node
        addNode(
          _user,
          _selectedText,
          _documentId,
          position.x,
          position.y,
          position.z,
          dataType
        );
      }

      // reset selected text
      setSelectedText({ text: "", from: -1 });
    }
  }

  return {
    dragToAddNode,
  };
}
