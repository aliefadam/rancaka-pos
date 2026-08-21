import { Fragment } from 'react';

const safeUrl = (value, image = false) => {
    if (!value) return image ? null : '#';
    if (value.startsWith('/') || /^https?:\/\//i.test(value) || (!image && /^mailto:/i.test(value))) return value;
    return image ? null : '#';
};

const renderText = (node, key) => {
    let content = node.text ?? '';
    for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') content = <strong>{content}</strong>;
        if (mark.type === 'italic') content = <em>{content}</em>;
        if (mark.type === 'underline') content = <u>{content}</u>;
        if (mark.type === 'strike') content = <s>{content}</s>;
        if (mark.type === 'code') content = <code>{content}</code>;
        if (mark.type === 'link') content = <a href={safeUrl(mark.attrs?.href)} target="_blank" rel="noreferrer">{content}</a>;
    }
    return <Fragment key={key}>{content}</Fragment>;
};

const renderNode = (node, key) => {
    if (!node) return null;
    if (node.type === 'text') return renderText(node, key);
    const children = (node.content ?? []).map((child, index) => renderNode(child, `${key}-${index}`));
    if (node.type === 'doc') return <Fragment key={key}>{children}</Fragment>;
    if (node.type === 'paragraph') return <p key={key}>{children}</p>;
    if (node.type === 'heading') {
        const Tag = node.attrs?.level === 3 ? 'h3' : 'h2';
        return <Tag key={key}>{children}</Tag>;
    }
    if (node.type === 'bulletList') return <ul key={key}>{children}</ul>;
    if (node.type === 'orderedList') return <ol key={key}>{children}</ol>;
    if (node.type === 'listItem') return <li key={key}>{children}</li>;
    if (node.type === 'blockquote') return <blockquote key={key}>{children}</blockquote>;
    if (node.type === 'hardBreak') return <br key={key} />;
    if (node.type === 'horizontalRule') return <hr key={key} />;
    if (node.type === 'image') {
        const src = safeUrl(node.attrs?.src, true);
        return src ? <img key={key} src={src} alt={node.attrs?.alt ?? ''} loading="lazy" /> : null;
    }
    return <Fragment key={key}>{children}</Fragment>;
};

export default function RichTextContent({ content, className = '' }) {
    return <div className={`rich-ticket-content ${className}`}>{renderNode(content, 'document')}</div>;
}
