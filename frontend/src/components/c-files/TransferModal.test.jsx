import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TransferModal, TransferDetailRows, getLatestTransferInfo } from './CFilesShared.jsx';
import HistoryModal from '../HistoryModal.jsx';

describe('C-File TransferModal optional remark and file attachment', () => {
  afterEach(() => {
    cleanup();
  });

  const sampleRecord = {
    id: 42,
    file_no: 'CMA/CCU/24/C/582',
    status: 'New',
  };

  it('hides remark and file browse controls by default and reveals them only when toggled', () => {
    render(
      <TransferModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        record={sampleRecord}
        currentUser={{ department: 'CCU' }}
      />
    );

    expect(screen.getByText('Transfer C-File')).toBeTruthy();
    expect(screen.queryByLabelText('Remark (Optional)')).toBeNull();
    expect(screen.queryByRole('button', { name: /Browse File/i })).toBeNull();

    // Expand remark only
    fireEvent.click(screen.getByRole('button', { name: /Add Remark/i }));
    expect(screen.getByLabelText('Remark (Optional)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Browse File/i })).toBeNull();

    // Expand attachment too
    fireEvent.click(screen.getByRole('button', { name: /Attach File/i }));
    expect(screen.getByRole('button', { name: /Browse File/i })).toBeTruthy();

    // Remove remark clears and hides it
    fireEvent.change(screen.getByLabelText('Remark (Optional)'), { target: { value: 'Check deed' } });
    fireEvent.click(screen.getByTitle('Remove remark'));
    expect(screen.queryByLabelText('Remark (Optional)')).toBeNull();
  });

  it('submits department only when optional sections are untouched', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TransferModal
        isOpen={true}
        onClose={() => {}}
        onSave={onSave}
        record={sampleRecord}
        currentUser={{ department: 'CCU' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Transfer/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('LEGAL', { remark: '', fileObj: null });
    });
  });

  it('submits trimmed remark and browsed file when added, and resets on reopen', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <TransferModal
        isOpen={true}
        onClose={() => {}}
        onSave={onSave}
        record={sampleRecord}
        currentUser={{ department: 'CCU' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Remark/i }));
    fireEvent.change(screen.getByLabelText('Remark (Optional)'), {
      target: { value: '  Please review legal notice  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Attach File/i }));
    const file = new File(['hello pdf'], 'legal-note.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('Browse transfer document');
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('legal-note.pdf')).toBeTruthy();
    expect(screen.getByRole('button', { name: /File Attached/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Transfer/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('LEGAL', {
        remark: 'Please review legal notice',
        fileObj: file,
      });
    });

    // Close and reopen for another record: optional sections reset to hidden
    rerender(
      <TransferModal
        isOpen={false}
        onClose={() => {}}
        onSave={onSave}
        record={sampleRecord}
        currentUser={{ department: 'CCU' }}
      />
    );
    rerender(
      <TransferModal
        isOpen={true}
        onClose={() => {}}
        onSave={onSave}
        record={{ id: 43, file_no: 'CMA/CCU/24/C/999', status: 'New' }}
        currentUser={{ department: 'CCU' }}
      />
    );

    expect(screen.queryByLabelText('Remark (Optional)')).toBeNull();
    expect(screen.queryByRole('button', { name: /Browse File/i })).toBeNull();
  });
});

describe('TransferDetailRows and HistoryModal rendering for remark and attachment', () => {
  afterEach(() => {
    cleanup();
  });

  it('extracts and renders transfer remark and attachment in TransferDetailRows and HistoryModal', () => {
    const record = {
      id: 42,
      file_no: 'CMA/CCU/24/C/582',
      status: 'Transferred',
      assigned_department: 'LEGAL',
      history: JSON.stringify([
        {
          name: 'Admin (admin)',
          action: 'Transferred',
          from_department: 'ADMIN',
          to_department: 'LEGAL',
          time: '2026-11-11T10:00:00.000Z',
          note: 'Transferred to LEGAL',
          remark: 'Verify title deed urgently',
          document_path: 'uploads/cfiles/CFILE_TRANSFER_42_123.pdf',
          document_name: 'title-deed.pdf',
        },
      ]),
    };

    const info = getLatestTransferInfo(record, { preferTransferred: true });
    expect(info.remark).toBe('Verify title deed urgently');
    expect(info.documentName).toBe('title-deed.pdf');

    const { rerender } = render(<TransferDetailRows record={record} />);
    expect(screen.getByText('Verify title deed urgently')).toBeTruthy();
    const docLink = screen.getByRole('link', { name: /title-deed\.pdf/i });
    expect(docLink.getAttribute('href')).toContain('uploads/cfiles/CFILE_TRANSFER_42_123.pdf');

    // Returned to CCU with remark and attachment
    const returnedRecord = {
      id: 42,
      file_no: 'CMA/CCU/24/C/582',
      status: 'Pending',
      assigned_department: null,
      history: JSON.stringify([
        ...JSON.parse(record.history),
        {
          name: 'Legal Officer',
          action: 'Returned to CCU',
          from_department: 'LEGAL',
          to_department: 'CCU',
          time: '2026-11-11T11:00:00.000Z',
          note: 'Returned to CCU (Admin)',
          remark: 'Opinion attached',
          document_path: 'uploads/cfiles/CFILE_TRANSFER_42_456.pdf',
          document_name: 'legal-opinion.pdf',
        },
      ]),
    };

    rerender(<TransferDetailRows record={returnedRecord} />);
    expect(screen.getByText('Opinion attached')).toBeTruthy();
    expect(screen.getByRole('link', { name: /legal-opinion\.pdf/i })).toBeTruthy();

    // HistoryModal shows both entries' remarks and attachments
    cleanup();
    render(<HistoryModal isOpen={true} onClose={() => {}} record={returnedRecord} />);
    expect(screen.getByText('Verify title deed urgently')).toBeTruthy();
    expect(screen.getByText('Opinion attached')).toBeTruthy();
    expect(screen.getByRole('link', { name: /title-deed\.pdf/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /legal-opinion\.pdf/i })).toBeTruthy();
  });
});
