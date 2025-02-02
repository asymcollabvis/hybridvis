import { useEffect, useState } from "react";
import { useClient } from "../../common/client";
import { constructUserKeyFromUser } from "../../common/helper";
import { RequestById, Document } from "../../common/message";
import { useAppDispatch, useAppSelector } from "../../hooks";
import store from "../../store";
import { selectUser } from "../user/userSlice";
import { selectDocumentContentList } from "./documentSlice";
import { useDocumentsStore } from "../../stores/store";

export default function useDocument(index: number | null = null) {
  const selector = useAppSelector;
  const documentId = useDocumentsStore(state => state.documentId);
  const currDocId = index ?? documentId.id;
  const client = useClient();

  const document = selector(selectDocumentContentList)[currDocId];
  const user = selector(selectUser);

  useEffect(() => {
    // console.log(documentId);

    // only push document to server when it is local
    if (user && documentId.local) {
      const request: RequestById = {
        id: `${currDocId}`,
        userKey: constructUserKeyFromUser(user),
      }
      // client.getDoument(request, {}, (err, res: Document) => {
      //   // console.log(res.getContent());

      //   setDocument(res.getContent().trim().replace(/\n *(\w)/g, "$1").replace(/\n/g, "\n\n"));
      // });

      if (index == null)
        client.updateDocumentState(request);
    }
  }, [documentId]);

  return document;
}
