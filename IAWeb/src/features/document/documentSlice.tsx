import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DocumentState } from "../../common/message";
import { RootState } from "../../store";

export type DocInfo = {
  id: string;
  title: string;
  fileName: string;
  author?: string;
  date?: string;
};

// Define a type for the slice state
interface DocumentSliceState {
  documentId: number;
  documentState?: DocumentState;
  documents: DocInfo[];
  // documentContent: string;
  documentContentList: {
    [key: number]: string;
  };
}

// Define the initial state using that type
const initialState: DocumentSliceState = {
  documentId: 0,
  documents: [],
  // documentContent: "",
  documentContentList: {},
};

export const documentSlice = createSlice({
  name: "document",
  initialState,
  reducers: {
    setDocumentId(state, action: PayloadAction<number>) {
      // console.log("this user is currently reading", action.payload);
      if (state.documentId === action.payload) {
        return;
      }

      state.documentId = action.payload;
    },
    setDocumentState(state, action: PayloadAction<DocumentState>) {
      state.documentState = action.payload;
    },
    setDocInfos(state, action: PayloadAction<DocInfo[]>) {
      state.documents = action.payload;
    },
    // setDocumentContent(state, action: PayloadAction<string>) {
    //   state.documentContent = action.payload;
    // },
    setDocumentContent(
      state,
      action: PayloadAction<{ id: number; content: string }>
    ) {
      state.documentContentList[action.payload.id] = action.payload.content;
    },
  },
});

export const {
  setDocumentId,
  setDocumentState,
  setDocInfos,
  setDocumentContent,
} = documentSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectDocumentId = (state: RootState) => state.document.documentId;
export const selectDocumentState = (state: RootState) =>
  state.document.documentState;
export const selectDocuments = (state: RootState) => state.document.documents;
export const selectDocumentContentList = (state: RootState) =>
  state.document.documentContentList;

export default documentSlice.reducer;
