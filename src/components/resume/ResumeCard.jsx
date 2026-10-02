import React from 'react';
import {
  FilePdfOutlined,
  FileWordOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { Button, Card, Tag, Tooltip, Dropdown, Spin } from 'antd';
import dayjs from 'dayjs';
import { colors, shadows } from '../../theme/tokens';

// Compatibility alias pointing directly to central colors token
export const COLORS = colors;

/**
 * Returns file icon component based on file type.
 */
export const getFileIcon = (fileType) => {
  if (fileType === 'application/pdf') {
    return <FilePdfOutlined style={{ fontSize: 32, color: colors.error }} />;
  }
  return <FileWordOutlined style={{ fontSize: 32, color: '#2563EB' }} />;
};

/**
 * Formats byte size into human readable string.
 */
export const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const ResumeCard = ({
  resume = {},
  selected = false,
  isSelected = false,
  loading = false,
  badge,
  actions,
  onClick,
  onView,
  onDownload,
  onRename,
  onDuplicate,
  onDelete,
  onPreview,
  menuActions,
  draggable = false,
  onDragStart,
  style = {},
  className = '',
}) => {
  const activeSelected = selected || isSelected;

  const handleClick = (e) => {
    if (onClick) {
      onClick(resume, e);
    }
  };

  const handleDragStart = (e) => {
    if (onDragStart) {
      onDragStart(e, resume);
    }
  };

  const title = resume.resume_name || resume.name || resume.file_name || 'Untitled Resume';
  const rawDate = resume.uploaded_at || resume.updated_at || resume.created_at;
  const formattedDate = rawDate ? dayjs(rawDate).format('MMM D, YYYY') : '';
  const formattedSize = formatFileSize(resume.file_size);

  const cardStyle = {
    borderRadius: 16,
    border: activeSelected
      ? `2px solid ${colors.primary || '#10B981'}`
      : `1px solid ${colors.cardBorder || '#E5E7EB'}`,
    backgroundColor: activeSelected
      ? (colors.primaryLight || '#ECFDF5')
      : (colors.background || '#FFFFFF'),
    transition: 'all 0.3s ease',
    minHeight: 200,
    position: 'relative',
    cursor: onClick ? 'pointer' : 'default',
    boxShadow: activeSelected ? (shadows?.primaryGlow || '0 2px 8px rgba(16, 185, 129, 0.2)') : 'none',
    overflow: 'hidden',
    ...style,
  };

  const renderBadge = () => {
    if (badge) {
      if (typeof badge === 'string') {
        return (
          <Tag style={{ marginTop: 4, background: colors.primaryLight, color: colors.primaryHover, borderColor: colors.primaryBorder, fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {badge}
          </Tag>
        );
      }
      return badge;
    }
    if (resume.target_role) {
      return (
        <Tag style={{ marginTop: 4, background: colors.primaryLight, color: colors.primaryHover, borderColor: colors.primaryBorder, fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {resume.target_role}
        </Tag>
      );
    }
    return null;
  };

  const renderActions = () => {
    if (actions) {
      return typeof actions === 'function' ? actions(resume) : actions;
    }

    const hasViewOrPreview = onView || onPreview;
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        {hasViewOrPreview && (
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (onView) onView(resume, e);
                else if (onPreview) onPreview(resume, e);
              }}
              style={{ color: colors.textSecondary }}
            />
          </Tooltip>
        )}
        {onDownload && (
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(resume, e);
              }}
              style={{ color: colors.textSecondary }}
            />
          </Tooltip>
        )}
        {onRename && (
          <Tooltip title="Rename">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRename(resume, e);
              }}
              style={{ color: colors.textSecondary }}
            />
          </Tooltip>
        )}
        {onDuplicate && (
          <Tooltip title="Duplicate">
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(resume, e);
              }}
              style={{ color: colors.textSecondary }}
            />
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Delete">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={(e) => {
                e.stopPropagation();
                onDelete(resume, e);
              }}
            />
          </Tooltip>
        )}
        {menuActions && (
          <Dropdown menu={{ items: menuActions }} trigger={['click']}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              onClick={(e) => e.stopPropagation()}
              style={{ color: colors.textSecondary }}
            />
          </Dropdown>
        )}
      </div>
    );
  };

  return (
    <Card
      key={resume.id}
      draggable={draggable}
      onDragStart={handleDragStart}
      onClick={handleClick}
      style={cardStyle}
      className={`resume-card ${activeSelected ? 'selected' : ''} ${className}`}
      hoverable
    >
      <Spin spinning={loading}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', minWidth: 0, marginBottom: 12 }}>
              <div style={{ flexShrink: 0 }}>{getFileIcon(resume.file_type)}</div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <Tooltip title={title}>
                  <h4 style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%'
                  }}>
                    {title}
                  </h4>
                </Tooltip>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  {renderBadge()}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${colors.divider}`, paddingTop: 12, marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {formattedDate} {formattedSize && `• ${formattedSize}`}
            </div>
            {renderActions()}
          </div>
        </div>
      </Spin>
    </Card>
  );
};

export default ResumeCard;
