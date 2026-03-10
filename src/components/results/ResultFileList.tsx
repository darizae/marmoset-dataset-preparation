import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import React from 'react';
import { ParsedResultFile } from '../../domain/resultsTypes';

interface Props {
    files: ParsedResultFile[];
    onRemove?: (fileName: string) => void;
}

const ResultFileList: React.FC<Props> = ({ files, onRemove }) => {
    if (!files.length) {
        return <Typography variant="body2" color="text.secondary">No result files loaded yet.</Typography>;
    }

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>File</TableCell>
                        <TableCell>Format</TableCell>
                        <TableCell>Subjects</TableCell>
                        <TableCell>Sessions</TableCell>
                        <TableCell>Total rows</TableCell>
                        <TableCell>Eligible</TableCell>
                        <TableCell align="right">Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {files.map((file) => (
                        <TableRow key={file.fileName}>
                            <TableCell>{file.fileName}</TableCell>
                            <TableCell>{file.format}</TableCell>
                            <TableCell>{file.subjects.join(', ') || '—'}</TableCell>
                            <TableCell>{file.sessionIds.join(', ') || '—'}</TableCell>
                            <TableCell>{file.totalRows}</TableCell>
                            <TableCell>{file.eligibleRows}</TableCell>
                            <TableCell align="right">
                                {onRemove ? (
                                    <Tooltip title="Remove file">
                                        <IconButton aria-label={`Remove ${file.fileName}`} onClick={() => onRemove(file.fileName)}>
                                            <DeleteOutlineRoundedIcon />
                                        </IconButton>
                                    </Tooltip>
                                ) : null}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ResultFileList;
