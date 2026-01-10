import React from 'react';

const HelpTab: React.FC = () => {
    return (
        <div>
            <section className="section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                <div className="section-title">Help</div>
                <div className="section-subtitle">
                    Notes on trial generation tuning options and what they mean in the experimental design.
                </div>
            </section>

            <section className="section">
                <div className="panel">
                    <div className="panel-title">Trial Generation Tuning and Options</div>

                    <div className="small-text" style={{ marginBottom: '0.75rem' }}>
                        <strong>Total trials:</strong>
                        <ul style={{ marginTop: '0.25rem' }}>
                            <li>Number of trials generated per subject.</li>
                        </ul>
                    </div>

                    <div className="small-text" style={{ marginBottom: '0.75rem' }}>
                        <strong>Familiar fraction:</strong>
                        <ul style={{ marginTop: '0.25rem' }}>
                            <li>
                                Fraction of trials whose <strong>call identity</strong> comes from a <strong>familiar</strong> identity (as defined by <code>familiarity</code> in <code>data_info.csv</code>). In your design, setting this to <code>0.5</code> gives equal familiar vs unfamiliar call trials (assuming enough stimulus availability).
                            </li>
                        </ul>
                    </div>

                    <div className="small-text" style={{ marginBottom: '0.75rem' }}>
                        <strong>Partner fraction within familiar:</strong>
                        <ul style={{ marginTop: '0.25rem' }}>
                            <li>Among the <strong>familiar-call</strong> trials, what fraction should be <strong>partner calls</strong>.</li>
                            <li>
                                Example with your defaults: <code>total=40</code>, <code>familiarFraction=0.5</code> → 20 familiar-call trials and 20 unfamiliar-call trials.
                            </li>
                            <li>
                                Then <code>partnerFractionWithinFamiliar=0.5</code> → 10 partner-call trials + 10 familiar-non-partner-call trials.
                            </li>
                        </ul>
                    </div>

                    <div className="small-text" style={{ marginBottom: '0.75rem' }}>
                        <strong>Global seed:</strong>
                        <div style={{ marginTop: '0.25rem' }}>
                            A deterministic seed string. Given the same dataset and same seed policy, you get the same shuffles / picks. The app uses <code>{'{globalSeed}::{subjectId}'}</code> to derive per-subject seeds unless overridden.
                        </div>
                    </div>

                    <div className="small-text" style={{ marginBottom: '0.75rem' }}>
                        <strong>Balance partner side:</strong>
                        <div style={{ marginTop: '0.25rem' }}>
                            Forces partner’s face to be on the left ~half the time and right ~half the time. With the fix below, it will be <strong>balanced and randomized in order</strong>, not “all-left first”.
                        </div>
                    </div>

                    <div className="small-text">
                        <strong>Avoid repeat audio–image pairings:</strong>
                        <div style={{ marginTop: '0.25rem', marginBottom: '0.35rem' }}>
                            For a given identity, tries not to show the same combination of:
                        </div>
                        <ul style={{ marginTop: '0.25rem' }}>
                            <li>audio exemplar index (call recording)</li>
                            <li>image exemplar index (face photo)</li>
                        </ul>
                        <div style={{ marginTop: '0.35rem' }}>
                            until the combinations are exhausted (then it resets). This is the “no fixed pairing is learned” requirement.
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HelpTab;
