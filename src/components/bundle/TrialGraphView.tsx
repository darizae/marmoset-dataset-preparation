import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { TrialSet } from '../../domain/trialTypes';

type ConditionLabel = 'partner' | 'familiar_non_partner' | 'unfamiliar' | 'unknown';

function deriveCondition(isPartnerCall: boolean, callCategory: string): ConditionLabel {
    if (isPartnerCall) return 'partner';
    const c = String(callCategory || '').toLowerCase();
    if (c === 'familiar') return 'familiar_non_partner';
    if (c === 'unfamiliar') return 'unfamiliar';
    return 'unknown';
}

interface Props {
    trialSet: TrialSet;
    onSelectIdentity: (identityId: string) => void;
    selectedIdentityId: string | null;
}

type NodePoint = {
    id: string;
    x: number;
    y: number;
    size: number;
    label: string;
    isPartner: boolean;
};

type EdgePoint = {
    otherId: string;
    x: number;
    y: number;
    label: string;
    count: number;
};

const TrialGraphView: React.FC<Props> = ({ trialSet, onSelectIdentity, selectedIdentityId }) => {
    const graph = useMemo(() => {
        const partnerId = trialSet.meta.partnerId;

        const countsByOther = new Map<string, number>();
        const countsByOtherByCond = new Map<string, Record<ConditionLabel, number>>();

        for (const t of trialSet.trials) {
            const other = t.otherIdentityId;
            countsByOther.set(other, (countsByOther.get(other) || 0) + 1);
            const cond = deriveCondition(t.isPartnerCall, t.callCategory);
            const rec = countsByOtherByCond.get(other) || { partner: 0, familiar_non_partner: 0, unfamiliar: 0, unknown: 0 };
            rec[cond] += 1;
            countsByOtherByCond.set(other, rec);
        }

        const others = Array.from(countsByOther.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);

        const nodes: NodePoint[] = [];
        nodes.push({ id: partnerId, x: 0, y: 0, size: 26, label: `${partnerId} (partner)`, isPartner: true });

        const radius = 1.6;
        const n = Math.max(others.length, 1);
        for (let i = 0; i < others.length; i++) {
            const angle = (2 * Math.PI * i) / n;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const count = countsByOther.get(others[i]) || 0;
            const size = Math.max(12, Math.min(26, 10 + Math.sqrt(count) * 3));
            nodes.push({ id: others[i], x, y, size, label: `${others[i]} · ${count} trials`, isPartner: false });
        }

        const edgeMidpoints: EdgePoint[] = [];
        for (const otherId of others) {
            const node = nodes.find((nd) => nd.id === otherId);
            if (!node) continue;
            const count = countsByOther.get(otherId) || 0;
            const conds = countsByOtherByCond.get(otherId) || { partner: 0, familiar_non_partner: 0, unfamiliar: 0, unknown: 0 };
            const label = [
                `${otherId}`,
                `total: ${count}`,
                `partner-call trials: ${conds.partner}`,
                `familiar-non-partner trials: ${conds.familiar_non_partner}`,
                `unfamiliar trials: ${conds.unfamiliar}`
            ].join('<br>');
            edgeMidpoints.push({ otherId, x: node.x / 2, y: node.y / 2, label, count });
        }

        return { partnerId, nodes, edgeMidpoints };
    }, [trialSet]);

    const nodeTrace = useMemo(() => {
        return {
            type: 'scatter',
            mode: 'markers+text',
            x: graph.nodes.map((n) => n.x),
            y: graph.nodes.map((n) => n.y),
            text: graph.nodes.map((n) => n.id),
            textposition: 'top center',
            hovertemplate: '%{customdata}<extra></extra>',
            customdata: graph.nodes.map((n) => n.label),
            marker: {
                size: graph.nodes.map((n) => n.size),
                color: graph.nodes.map((n) => (n.isPartner ? '#22c55e' : '#38bdf8')),
                line: { width: 2, color: graph.nodes.map((n) => (selectedIdentityId === n.id ? '#facc15' : '#0b1120')) }
            }
        } as const;
    }, [graph.nodes, selectedIdentityId]);

    const edgeLineTraces = useMemo(() => {
        const traces: any[] = [];
        for (const node of graph.nodes) {
            if (node.isPartner) continue;
            traces.push({
                type: 'scatter',
                mode: 'lines',
                x: [0, node.x],
                y: [0, node.y],
                hoverinfo: 'skip',
                line: { width: 2, color: '#334155' }
            });
        }
        return traces;
    }, [graph.nodes]);

    const edgeHitTrace = useMemo(() => {
        return {
            type: 'scatter',
            mode: 'markers',
            x: graph.edgeMidpoints.map((e) => e.x),
            y: graph.edgeMidpoints.map((e) => e.y),
            hovertemplate: '%{customdata}<extra></extra>',
            customdata: graph.edgeMidpoints.map((e) => e.label),
            marker: {
                size: graph.edgeMidpoints.map((e) => Math.max(14, Math.min(28, 10 + Math.sqrt(e.count) * 3))),
                color: 'rgba(0,0,0,0)',
                line: { width: 1, color: 'rgba(0,0,0,0)' }
            }
        } as const;
    }, [graph.edgeMidpoints]);

    const onClick = (ev: any) => {
        const pt = ev?.points?.[0];
        if (!pt) return;

        const traceIndex = pt.curveNumber as number;
        const isNodeTrace = traceIndex === edgeLineTraces.length;
        if (isNodeTrace) {
            const pointIndex = pt.pointIndex as number;
            const nodeId = graph.nodes[pointIndex]?.id;
            if (nodeId) onSelectIdentity(nodeId);
            return;
        }

        const isEdgeHitTrace = traceIndex === edgeLineTraces.length + 1;
        if (isEdgeHitTrace) {
            const pointIndex = pt.pointIndex as number;
            const otherId = graph.edgeMidpoints[pointIndex]?.otherId;
            if (otherId) onSelectIdentity(otherId);
        }
    };

    return (
        <div className="panel">
            <div className="panel-title">Identity relationship view</div>
            <div className="panel-subtitle">
                Click a node (or a link midpoint) to focus the trial list on that identity. Partner is centered.
            </div>
            <Plot
                data={[...edgeLineTraces, nodeTrace, edgeHitTrace]}
                layout={{
                    height: 440,
                    margin: { l: 30, r: 30, t: 10, b: 20 },
                    xaxis: { visible: false },
                    yaxis: { visible: false },
                    paper_bgcolor: '#020617',
                    plot_bgcolor: '#020617',
                    font: { color: '#e5e7eb' },
                    showlegend: false
                }}
                config={{ displayModeBar: false, responsive: true }}
                onClick={onClick}
                style={{ width: '100%' }}
                useResizeHandler
            />
        </div>
    );
};

export default TrialGraphView;
