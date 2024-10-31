"use client";
import { useState } from 'react';
import { BsChatRight } from 'react-icons/bs'
import { BsFileEarmarkText } from 'react-icons/bs'

interface sbuttonProps {
    variant: string;
    onClick: () => void;
}

const SwitchButton: React.FC<sbuttonProps> = ({ variant, onClick }) => {

    return (
        <div className="w-full flex flex-col justify-center mt-5 gap-3 pb-20">
            <div className='flex mx-auto bg-neutral-800 p-1 rounded-md shadow-md'>
                <ButtonX label="Schedule" selected={variant == "INFO"} onClick={onClick} />
                <ButtonX label="Results" selected={variant == "RESULTS"} onClick={onClick} />

            </div>
        </div>
    )
}

interface buttonProps {
    label: string;
    selected: boolean;
    onClick: () => void;
}

const ButtonX: React.FC<buttonProps> = ({ label, selected, onClick }) => {
    return (
        <button className={`flex items-center justify-center p-2 rounded-md ${selected ? 'bg-blue-600 text-white' : 'text-gray-400'}`} onClick={onClick}>
            <span>{label}</span>
        </button>
    )
}

export default SwitchButton