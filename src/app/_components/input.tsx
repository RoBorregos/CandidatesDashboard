"use client";
import { api } from "rbrgs/trpc/react";

interface InputProps {
    teamId: string;
    prevLink: string;
}

const Input: React.FC<InputProps> = ({ teamId, prevLink }) => {
    const saveLink = api.team.saveLink.useMutation();

    const onSave = () => {
        const driveLink = document.getElementById("drive-link") as HTMLInputElement;
            saveLink.mutate({
                teamId: teamId,
                link: driveLink.value
            });
        
        alert("Link saved");

    }

    return (
        <div className="mt-10 px-20">
            <div className="flex flex-col">
                <label className="text-sm font-semibold">Google Drive Link</label>
                <input
                    id="drive-link"
                    type="text"
                    defaultValue={prevLink}
                    className="border border-gray-200 text-gray-900 rounded-md p-2 mt-1"
                    placeholder="https://drive.google.com/"
                />
            </div>

            <div className="mt-4">
                <button onClick={onSave} className="bg-blue-700 text-white rounded-md p-2">
                    Save
                </button>
            </div>
        </div>
    );

}

export default Input;