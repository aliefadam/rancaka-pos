import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRef, useState } from 'react';

const EMPTY_DOCUMENT = { type: 'doc', content: [{ type: 'paragraph' }] };

const ToolbarButton = ({ active = false, disabled = false, icon, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        aria-pressed={active}
        className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
    >
        <i className={`fi ${icon}`} />
    </button>
);

export default function RichTextEditor({ value, onChange, error, placeholder = 'Tuliskan detail di sini...', minHeight = '260px' }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const uploadImage = async (file) => {
        if (!file?.type?.startsWith('image/')) return null;
        setUploading(true);
        setUploadError('');
        const body = new FormData();
        body.append('image', file);
        try {
            const response = await window.axios.post(route('admin.development-tickets.images.store'), body);
            return response.data.url;
        } catch (requestError) {
            setUploadError(requestError.response?.data?.message ?? 'Gambar gagal diunggah. Maksimal 5 MB.');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: false,
                underline: false,
            }),
            Underline,
            Image.configure({ allowBase64: false, HTMLAttributes: { class: 'ticket-inline-image' } }),
            Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
            Placeholder.configure({ placeholder }),
        ],
        content: value ?? EMPTY_DOCUMENT,
        onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getJSON()),
        editorProps: {
            attributes: { class: 'ticket-editor-content', style: `min-height:${minHeight}` },
            handlePaste: (view, event) => {
                const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'));
                if (!file) return false;
                event.preventDefault();
                uploadImage(file).then((url) => {
                    if (url) editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
                });
                return true;
            },
            handleDrop: (view, event) => {
                const file = Array.from(event.dataTransfer?.files ?? []).find((item) => item.type.startsWith('image/'));
                if (!file) return false;
                event.preventDefault();
                uploadImage(file).then((url) => {
                    if (url) editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
                });
                return true;
            },
        },
    });

    const setLink = () => {
        const previous = editor.getAttributes('link').href;
        const href = window.prompt('Alamat tautan', previous ?? 'https://');
        if (href === null) return;
        if (!href.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run();
        else editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
    };

    const chooseImage = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        const url = await uploadImage(file);
        if (url) editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
    };

    if (!editor) return <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />;

    return (
        <div className={`overflow-hidden rounded-2xl border bg-white transition ${error ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100'}`}>
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/80 px-2 py-2">
                <ToolbarButton label="Heading" icon="fi-rr-h2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
                <ToolbarButton label="Tebal" icon="fi-rr-bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
                <ToolbarButton label="Miring" icon="fi-rr-italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
                <ToolbarButton label="Garis bawah" icon="fi-rr-underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
                <span className="mx-1 h-6 w-px bg-slate-200" />
                <ToolbarButton label="Bullet list" icon="fi-rr-list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
                <ToolbarButton label="Numbered list" icon="fi-rr-list-check" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
                <ToolbarButton label="Kutipan" icon="fi-rr-quote-right" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
                <ToolbarButton label="Tautan" icon="fi-rr-link" active={editor.isActive('link')} onClick={setLink} />
                <ToolbarButton label="Upload gambar" icon={uploading ? 'fi-rr-spinner animate-spin' : 'fi-rr-picture'} disabled={uploading} onClick={() => inputRef.current?.click()} />
                <span className="mx-1 h-6 w-px bg-slate-200" />
                <ToolbarButton label="Undo" icon="fi-rr-undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
                <ToolbarButton label="Redo" icon="fi-rr-redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
                <span className="ml-auto hidden text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:block">Tempel atau tarik screenshot</span>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="hidden" />
            </div>
            <EditorContent editor={editor} className="ticket-editor" />
            {(error || uploadError) && <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-600">{error || uploadError}</p>}
        </div>
    );
}

export { EMPTY_DOCUMENT };
