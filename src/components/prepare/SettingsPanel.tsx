import React from 'react';

interface Props {
    expectedImages: number;
    expectedAudios: number;
    setExpectedImages: (n: number) => void;
    setExpectedAudios: (n: number) => void;
}

const SettingsPanel: React.FC<Props> = ({
                                            expectedImages,
                                            expectedAudios,
                                            setExpectedImages,
                                            setExpectedAudios
                                        }) => {
    const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number.parseInt(e.target.value, 10);
        if (Number.isFinite(v) && v > 0) {
            setExpectedImages(v);
        }
    };
    const handleAudiosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number.parseInt(e.target.value, 10);
        if (Number.isFinite(v) && v > 0) {
            setExpectedAudios(v);
        }
    };

    return (
        <div className="inline-input-row">
            <div className="label">Expected minimum per identity:</div>
            <label className="label">
                Images
                <input
                    className="input-number"
                    type="number"
                    min={1}
                    value={expectedImages}
                    onChange={handleImagesChange}
                />
            </label>
            <label className="label">
                Audios
                <input
                    className="input-number"
                    type="number"
                    min={1}
                    value={expectedAudios}
                    onChange={handleAudiosChange}
                />
            </label>
            <span className="small-text">
        The checker will flag any ID with fewer than these numbers.
      </span>
        </div>
    );
};

export default SettingsPanel;
