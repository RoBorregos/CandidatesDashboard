"use client";
import { useState } from 'react';
import { BsChatRight } from 'react-icons/bs'
import { BsFileEarmarkText } from 'react-icons/bs'

interface sbuttonProps {
    variant: string;
    onClick: () => void;
}

const SwitchButton: React.FC<sbuttonProps> = ({ variant, onClick }) => {
    const [selected, setSelected] = useState("DOCS");

    return (
        <div className="fixed w-full flex flex-col justify-center  pl-52 mt-5 gap-3">
            <div className='flex mx-auto bg-white p-1 rounded-md shadow-md'>
                <ButtonX label="My documents" icon={BsFileEarmarkText} selected={variant == "DOCS"} onClick={onClick} />
                <ButtonX label="Chat Bot" icon={BsFileEarmarkText} selected={variant == "CHAT"} onClick={onClick} />

            </div>

        </div>
    )
}

interface buttonProps {
    label: string;
    icon: any;
    selected: boolean;
    onClick: () => void;
}

const ButtonX: React.FC<buttonProps> = ({ label, icon, selected, onClick }) => {
    return (
        <button className={`flex items-center justify-center p-2 rounded-md ${selected ? 'bg-blue-500 text-white' : 'text-gray-600'}`} onClick={onClick}>
            <span className="mr-2">{icon}</span>
            <span>{label}</span>
        </button>
    )
}

export default SwitchButton