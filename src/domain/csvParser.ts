import Papa from 'papaparse';
import { CsvIdentityRow, CsvParseResult } from './types';

const POSSIBLE_ID_COLS = ['ID', 'Id', 'id', 'Animal', 'animal', 'AnimalID', 'animal_id'];

export function parseDataInfoCsv(file: File): Promise<CsvParseResult> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors && results.errors.length > 0) {
                    const msg = results.errors.map((e) => e.message).join('; ');
                    reject(new Error(`CSV parse error(s): ${msg}`));
                    return;
                }

                const rawRows = results.data as any[];
                if (!rawRows || rawRows.length === 0) {
                    reject(new Error('data_info.csv is empty or has no valid rows.'));
                    return;
                }

                const cols = results.meta.fields || [];
                const idCol = POSSIBLE_ID_COLS.find((c) => cols.includes(c));
                if (!idCol) {
                    reject(
                        new Error(
                            `Could not find an ID column in data_info.csv. Available columns: ${cols.join(', ')}.`
                        )
                    );
                    return;
                }

                const rows: CsvIdentityRow[] = rawRows.map((r) => {
                    const row: CsvIdentityRow = { ID: String(r[idCol]).trim() };
                    cols.forEach((c) => {
                        if (c === idCol) return;
                        row[c] = r[c];
                    });
                    return row;
                });

                const infoColumns = cols.filter((c) => c !== idCol);

                resolve({ rows, infoColumns });
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}
