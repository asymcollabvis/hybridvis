import { Grid } from "@mui/material";
import React from "react";
import { selectDocumentState } from "../features/document/documentSlice";
import { selectUser } from "../features/user/userSlice";
import { useAppSelector } from "../hooks";
import DocumentList from "./DocumentList";
import DocumentView from "./DocumentView";

export default function DocumentPanel() {
    return (
        <div style={{flexGrow: 1,  minHeight:0, display: "flex", flexDirection: "column"}}>
            <DocumentList></DocumentList>
            <DocumentView></DocumentView>
        </div>
    );
}