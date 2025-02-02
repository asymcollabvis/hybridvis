import React from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useAppDispatch } from "../hooks";
import useDocumentList from "../features/document/useDocumentList";
import { useDocumentsStore } from "../stores/store";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 10 },
  { field: "title", headerName: "Title", width: 300 },
  //   { field: "author", headerName: "Author" },
  //   { field: "date", headerName: "Date" },
  // { field: "using", headerName: "Using" }, // NOTE: no need for single user, only for multiple users
];
export default function DocumentDisplayList() {
  console.log("DocumentDisplayList");

  const documents = useDocumentList();
  const dispatch = useAppDispatch();

  const { setDocumentId } = useDocumentsStore();

  //   console.log(documents.slice(0, 10));

  return (
    <div
      style={{
        height: 250,
        minHeight: 250,
        width: "100%",
        paddingRight: "8px",
        paddingLeft: "8px",
      }}
    >
      <DataGrid
        density={"compact"}
        rows={[...documents]}
        columns={columns}
        autoPageSize
        onSelectionModelChange={(itm) => setDocumentId(+itm[0])}
      />
    </div>
  );
}
