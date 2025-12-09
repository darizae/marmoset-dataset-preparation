import React from 'react';

interface Props {
    onFolderChange: (files: FileList | null) => void;
    folderLabel: string;
}

const FolderSelector: React.FC<Props> = ({ onFolderChange, folderLabel }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFolderChange(e.target.files);
    };

    return (
        <div className="inline-input-row">
            <label className="label" htmlFor="folder-input">
                Folder:
            </label>
            <input
                id="folder-input"
                className="input-file"
                type="file"
                // @ts-expect-error webkitdirectory is non-standard but supported in modern browsers
                webkitdirectory="true"
                multiple
                onChange={handleChange}
            />
            <span className="small-text">Selected: {folderLabel}</span>
        </div>
    );
};

export default FolderSelector;
