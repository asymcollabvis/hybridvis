import { Card, Button, Input, TextField } from "@mui/material";
import React from "react";
import useDragToAddNode from "../common/useDragToAddNode";
import { useAppSelector, useAppDispatch } from "../hooks";
import store from "../store";
import { useDocumentStore, useDocumentsStore } from "../stores/store";

export default function GraphLabelInput() {
  console.log("GraphLabelInput");

  const selector = useAppSelector;
  const selectedText = useDocumentStore((state) => state.selectedText);
  const setSelectedText = useDocumentStore((state) => state.setSelectedText);
  const { dragToAddNode } = useDragToAddNode();
  const dispatch = useAppDispatch();

  return (
    <Card
      sx={{
        position: "absolute",
        top: "8px",
        right: "8px",
        padding: "8px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {/* <Button
        onClick={() => {
          setSelectedText({
            text: selectedText == "" ? " " : selectedText,
            from: useDocumentsStore.getState().documentId.id,
          });
        }}
      >
        Add Node
      </Button> */}
      <div style={{ paddingRight: 4, width: 90 }}>Custom label here:</div>

      <TextField
        size="small"
        label="Text here"
        value={selectedText}
        onChange={(e) => {
          setSelectedText({
            text: e.target.value,
            from: useDocumentsStore.getState().documentId.id,
          });
        }}
        onKeyUp={(e) => {
          if (e.key == "Enter") {
            dragToAddNode();
          }
        }}
      />
    </Card>
  );
}
