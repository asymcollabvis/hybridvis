import { useEffect } from "react";

let myTextField: HTMLInputElement = document.createElement("input");
myTextField.type = "text";
document.body.appendChild(myTextField);
export default function useSystemKeyboard() {
    useEffect(() => {

    }, [])

    return {
        myTextField
    }
}
