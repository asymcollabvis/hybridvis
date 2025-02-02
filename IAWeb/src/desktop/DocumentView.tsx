import React from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { selectDocumentId } from "../features/document/documentSlice";
import { useGesture } from "@use-gesture/react";
import useDocument from "../features/document/useDocument";
import { Box } from "@mui/material";
import { useDocumentStore, useDocumentsStore } from "../stores/store";

export default function DocumentView() {
  const document = useDocument();
  const { documentId } = useDocumentsStore();
  const setSelectedText = useDocumentStore((state) => state.setSelectedText);
  // console.log("document", document);

  const bind = useGesture({
    onPointerUp: ({ event, ...sharedState }) => {
      // console.log(window.getSelection()?.toString());

      setSelectedText({
        text: window.getSelection()?.toString() ?? "",
        from: documentId.id,
      });
    },
  });

  return (
    <Box
      component={"div"}
      {...bind()}
      style={{
        flexGrow: 1,
        overflow: "auto",
        whiteSpace: "pre-line",
        fontSize: "16px",
        padding: "8px",
        minHeight: 0,
      }}
    >
      <div>Document ID: {documentId.id}</div>

      <div>{document}</div>
    </Box>
  );
}
