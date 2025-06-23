import { useEffect, useRef } from 'react';

const AssetImageGenerator = ({ metadata, onImageGenerated }) => {
  const canvasRef = useRef(null);
  
  // Generate the image whenever metadata changes
  useEffect(() => {
    if (!metadata || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions (8.5" x 11" at 72dpi)
    canvas.width = 612;  // 8.5 inches * 72dpi
    canvas.height = 792; // 11 inches * 72dpi
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Function to generate document layout based on metadata
    const generateDocumentLayout = (ctx, metadata) => {
      const { basic, ownership, value, visual } = metadata;
      const { primaryColor, secondaryColor, layoutStyle } = visual;
      
      // Common variables
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;
      const margin = 40;
      let y = 0; // Initialize y here to avoid the reference error
      
      // Apply different layouts based on style
      switch (layoutStyle) {
        case 'Modern': {
          // Modern layout with color bar on left
          ctx.fillStyle = primaryColor;
          ctx.fillRect(0, 0, 120, height);
          
          // Title area
          ctx.fillStyle = secondaryColor;
          ctx.fillRect(120, 0, width - 120, 100);
          
          // Title text
          ctx.font = 'bold 24px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(basic.title || 'Untitled Asset', 140, 60);
          
          // Asset type badge
          ctx.fillStyle = primaryColor;
          ctx.fillRect(width - 200, 120, 160, 40);
          ctx.font = '16px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(basic.assetType || 'Asset', width - 190, 145);
          
          // Asset details
          ctx.font = '16px Arial';
          ctx.fillStyle = '#000000';
          y = 180; // Now y is initialized before use
          
          // Description
          if (basic.description) {
            ctx.font = '14px Arial';
            wrapText(ctx, basic.description, 140, y, width - 180, 20);
            y += 80; // Adjust based on description length
          }
          
          // Owner info
          ctx.font = 'bold 16px Arial';
          ctx.fillText('Ownership Details', 140, y);
          y += 30;
          
          ctx.font = '14px Arial';
          if (ownership.ownerName) {
            ctx.fillText(`Owner: ${ownership.ownerName}`, 140, y);
            y += 25;
          }
          
          if (ownership.acquisitionDate) {
            ctx.fillText(`Acquired: ${ownership.acquisitionDate}`, 140, y);
            y += 25;
          }
          
          if (ownership.ownershipPercentage !== 100) {
            ctx.fillText(`Ownership: ${ownership.ownershipPercentage}%`, 140, y);
            y += 25;
          }
          
          // Value info
          y += 20;
          ctx.font = 'bold 16px Arial';
          ctx.fillText('Value Information', 140, y);
          y += 30;
          
          ctx.font = '14px Arial';
          if (value.estimatedValue) {
            ctx.fillText(`Estimated Value: ${value.estimatedValue} ${value.currency}`, 140, y);
            y += 25;
          }
          
          if (value.valuationDate) {
            ctx.fillText(`Valuation Date: ${value.valuationDate}`, 140, y);
            y += 25;
          }
          
          if (value.valuationMethod) {
            ctx.fillText(`Method: ${value.valuationMethod}`, 140, y);
            y += 25;
          }
          
          // Add QR code placeholder
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(width - 180, height - 180, 140, 140);
          ctx.font = '12px Arial';
          ctx.fillStyle = '#000000';
          ctx.fillText('QR Code', width - 150, height - 110);
          
          // Add footer
          ctx.fillStyle = secondaryColor;
          ctx.fillRect(0, height - 30, width, 30);
          ctx.font = '12px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`Asset ID: ${basic.assetId || 'N/A'} • Generated: ${new Date().toLocaleDateString()}`, margin, height - 10);
          break;
        }
        
        case 'Classic': {
          // Classic layout with border
          // Border
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 8;
          ctx.strokeRect(margin / 2, margin / 2, width - margin, height - margin);
          
          // Inner border
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(margin, margin, width - (margin * 2), height - (margin * 2));
          
          // Title
          ctx.font = 'bold 28px Times New Roman';
          ctx.fillStyle = primaryColor;
          ctx.textAlign = 'center';
          ctx.fillText(basic.title || 'Untitled Asset', width / 2, margin * 2);
          
          // Asset type
          ctx.font = 'italic 18px Times New Roman';
          ctx.fillText(basic.assetType || 'Asset', width / 2, margin * 2 + 30);
          
          // Reset text alignment
          ctx.textAlign = 'left';
          
          // Description
          if (basic.description) {
            ctx.font = '14px Times New Roman';
            y = margin * 2 + 70;
            wrapText(ctx, basic.description, margin * 2, y, width - (margin * 4), 20);
            y += 80;
          } else {
            y = margin * 2 + 70;
          }
          
          // Divider
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(margin * 2, y);
          ctx.lineTo(width - (margin * 2), y);
          ctx.stroke();
          y += 30;
          
          // Two column layout for details
          const col1X = margin * 2;
          const col2X = width / 2 + 20;
          
          // Owner info - Column 1
          ctx.font = 'bold 16px Times New Roman';
          ctx.fillStyle = primaryColor;
          ctx.fillText('Ownership Details', col1X, y);
          y += 25;
          
          ctx.font = '14px Times New Roman';
          ctx.fillStyle = '#000000';
          if (ownership.ownerName) {
            ctx.fillText(`Owner: ${ownership.ownerName}`, col1X, y);
            y += 20;
          }
          
          if (ownership.acquisitionDate) {
            ctx.fillText(`Acquired: ${ownership.acquisitionDate}`, col1X, y);
            y += 20;
          }
          
          if (ownership.ownershipPercentage !== 100) {
            ctx.fillText(`Ownership: ${ownership.ownershipPercentage}%`, col1X, y);
            y += 20;
          }
          
          // Value info - Column 2
          const valueY = y - (ownership.ownerName ? 60 : 20);
          ctx.font = 'bold 16px Times New Roman';
          ctx.fillStyle = primaryColor;
          ctx.fillText('Value Information', col2X, valueY);
          
          ctx.font = '14px Times New Roman';
          ctx.fillStyle = '#000000';
          if (value.estimatedValue) {
            ctx.fillText(`Value: ${value.estimatedValue} ${value.currency}`, col2X, valueY + 25);
          }
          
          if (value.valuationDate) {
            ctx.fillText(`Valuation Date: ${value.valuationDate}`, col2X, valueY + 45);
          }
          
          if (value.valuationMethod) {
            ctx.fillText(`Method: ${value.valuationMethod}`, col2X, valueY + 65);
          }
          
          // Signature line
          const sigY = height - (margin * 2);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(col1X, sigY);
          ctx.lineTo(col1X + 200, sigY);
          ctx.stroke();
          
          ctx.font = '12px Times New Roman';
          ctx.fillText('Authorized Signature', col1X + 50, sigY + 20);
          
          // Date
          ctx.beginPath();
          ctx.moveTo(col2X, sigY);
          ctx.lineTo(col2X + 150, sigY);
          ctx.stroke();
          
          ctx.fillText('Date', col2X + 60, sigY + 20);
          
          // Footer
          ctx.font = '10px Times New Roman';
          ctx.fillText(`Asset ID: ${basic.assetId || 'N/A'} • Generated: ${new Date().toLocaleDateString()}`, width / 2 - 100, height - margin);
          break;
        }
        
        case 'Minimal': {
          // Minimal layout with clean design
          // Header
          ctx.fillStyle = primaryColor;
          ctx.fillRect(0, 0, width, 80);
          
          // Title
          ctx.font = 'bold 24px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(basic.title || 'Untitled Asset', width / 2, 45);
          
          // Reset text alignment
          ctx.textAlign = 'left';
          
          // Content area
          y = 120;
          
          // Asset type badge
          ctx.fillStyle = '#f0f0f0';
          const badgeWidth = ctx.measureText(basic.assetType || 'Asset').width + 40;
          ctx.fillRect((width - badgeWidth) / 2, y, badgeWidth, 30);
          
          ctx.font = '14px Arial';
          ctx.fillStyle = '#333333';
          ctx.textAlign = 'center';
          ctx.fillText(basic.assetType || 'Asset', width / 2, y + 20);
          
          // Reset text alignment
          ctx.textAlign = 'left';
          y += 60;
          
          // Description
          if (basic.description) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#333333';
            wrapText(ctx, basic.description, margin * 2, y, width - (margin * 4), 20);
            y += 80;
          }
          
          // Details grid
          const gridMargin = margin * 2;
          const gridWidth = width - (gridMargin * 2);
          
          // Grid background
          ctx.fillStyle = '#f9f9f9';
          ctx.fillRect(gridMargin, y, gridWidth, 200);
          
          // Grid lines
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 1;
          
          // Horizontal lines
          ctx.beginPath();
          ctx.moveTo(gridMargin, y + 40);
          ctx.lineTo(gridMargin + gridWidth, y + 40);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(gridMargin, y + 100);
          ctx.lineTo(gridMargin + gridWidth, y + 100);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(gridMargin, y + 160);
          ctx.lineTo(gridMargin + gridWidth, y + 160);
          ctx.stroke();
          
          // Vertical line
          ctx.beginPath();
          ctx.moveTo(gridMargin + (gridWidth / 2), y);
          ctx.lineTo(gridMargin + (gridWidth / 2), y + 200);
          ctx.stroke();
          
          // Grid headers
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = secondaryColor;
          
          ctx.fillText('Owner', gridMargin + 10, y + 25);
          ctx.fillText('Acquisition', gridMargin + (gridWidth / 2) + 10, y + 25);
          ctx.fillText('Value', gridMargin + 10, y + 85);
          ctx.fillText('Valuation Method', gridMargin + (gridWidth / 2) + 10, y + 85);
          ctx.fillText('Asset ID', gridMargin + 10, y + 145);
          ctx.fillText('Ownership', gridMargin + (gridWidth / 2) + 10, y + 145);
          
          // Grid values
          ctx.font = '14px Arial';
          ctx.fillStyle = '#333333';
          
          ctx.fillText(ownership.ownerName || 'N/A', gridMargin + 10, y + 55);
          ctx.fillText(ownership.acquisitionDate || 'N/A', gridMargin + (gridWidth / 2) + 10, y + 55);
          ctx.fillText(`${value.estimatedValue || 'N/A'} ${value.currency}`, gridMargin + 10, y + 115);
          ctx.fillText(value.valuationMethod || 'N/A', gridMargin + (gridWidth / 2) + 10, y + 115);
          ctx.fillText(basic.assetId || 'N/A', gridMargin + 10, y + 175);
          ctx.fillText(`${ownership.ownershipPercentage || 100}%`, gridMargin + (gridWidth / 2) + 10, y + 175);
          
          // Footer
          ctx.fillStyle = primaryColor;
          ctx.fillRect(0, height - 40, width, 40);
          
          ctx.font = '12px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, width / 2, height - 15);
          break;
        }
        
        case 'Certificate': {
          // Certificate style layout
          // Border with corner ornaments
          drawCertificateBorder(ctx, margin, margin, width - (margin * 2), height - (margin * 2), primaryColor);
          
          // Title
          ctx.font = 'bold 36px Times New Roman';
          ctx.fillStyle = primaryColor;
          ctx.textAlign = 'center';
          ctx.fillText('Certificate of Ownership', width / 2, margin * 3);
          
          // Subtitle
          ctx.font = 'italic 24px Times New Roman';
          ctx.fillText(basic.assetType || 'Asset', width / 2, margin * 3 + 40);
          
          // Divider
          drawOrnamentalDivider(ctx, width / 2, margin * 3 + 70, 300, secondaryColor);
          
          // Main text
          ctx.font = '18px Times New Roman';
          ctx.fillStyle = '#000000';
          ctx.fillText('This certifies that', width / 2, margin * 3 + 120);
          
          // Owner name
          ctx.font = 'bold 24px Times New Roman';
          ctx.fillStyle = primaryColor;
          ctx.fillText(ownership.ownerName || 'Owner Name', width / 2, margin * 3 + 160);
          
          // Asset name
          ctx.font = '18px Times New Roman';
          ctx.fillStyle = '#000000';
          ctx.fillText('is the rightful owner of', width / 2, margin * 3 + 200);
          
          ctx.font = 'bold 28px Times New Roman';
          ctx.fillStyle = primaryColor;
          ctx.fillText(basic.title || 'Untitled Asset', width / 2, margin * 3 + 240);
          
          // Details
          ctx.font = '16px Times New Roman';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          
          if (basic.assetId) {
            ctx.fillText(`Asset ID: ${basic.assetId}`, width / 2, margin * 3 + 280);
          }
          
          if (value.estimatedValue) {
            ctx.fillText(`Valued at ${value.estimatedValue} ${value.currency}`, width / 2, margin * 3 + 310);
          }
          
          if (ownership.acquisitionDate) {
            ctx.fillText(`Acquired on ${ownership.acquisitionDate}`, width / 2, margin * 3 + 340);
          }
          
          if (ownership.ownershipPercentage !== 100) {
            ctx.fillText(`Ownership Percentage: ${ownership.ownershipPercentage}%`, width / 2, margin * 3 + 370);
          }
          
          // Signature lines
          ctx.textAlign = 'left';
          const sigLineY = height - (margin * 3);
          
          // Signature line 1
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(margin * 2, sigLineY);
          ctx.lineTo(margin * 2 + 200, sigLineY);
          ctx.stroke();
          
          ctx.font = '14px Times New Roman';
          ctx.fillText('Authorized Signature', margin * 2 + 50, sigLineY + 25);
          
          // Signature line 2
          ctx.beginPath();
          ctx.moveTo(width - (margin * 2) - 200, sigLineY);
          ctx.lineTo(width - (margin * 2), sigLineY);
          ctx.stroke();
          
          ctx.fillText('Date', width - (margin * 2) - 100, sigLineY + 25);
          
          // Footer
          ctx.font = '12px Times New Roman';
          ctx.textAlign = 'center';
          ctx.fillText(`Generated on ${new Date().toLocaleDateString()}`, width / 2, height - (margin * 1.5));
          break;
        }
        
        default: {
          // Default to Classic if no valid layout style
          // Simple centered text
          ctx.font = 'bold 24px Arial';
          ctx.fillStyle = primaryColor;
          ctx.textAlign = 'center';
          ctx.fillText(basic.title || 'Untitled Asset', width / 2, height / 2);
          break;
        }
      }
    };
    // Apply layout based on style
    generateDocumentLayout(ctx, metadata);
    
    // Convert canvas to image data URL and pass it to parent
    const imageDataUrl = canvas.toDataURL('image/png');
    onImageGenerated(imageDataUrl);
  }, [metadata, onImageGenerated]);
  
  // Helper function to wrap text
  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    if (!text) return y;
    
    const words = text.split(' ');
    let line = '';
    let testLine = '';
    let lineCount = 0;
    
    for (let n = 0; n < words.length; n++) {
      testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
        lineCount++;
        
        if (lineCount >= 5) {
          // Add ellipsis if text is too long
          ctx.fillText(line + '...', x, y);
          break;
        }
      } else {
        line = testLine;
      }
    }
    
    if (lineCount < 5) {
      ctx.fillText(line, x, y);
    }
    
    return y + lineHeight;
  };
  
  // Helper function to draw certificate border with ornaments
  const drawCertificateBorder = (ctx, x, y, width, height, color) => {
    // Main border
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Corner ornaments
    const ornamentSize = 30;
    
    // Top left
    drawOrnament(ctx, x, y, ornamentSize, color);
    // Top right
    drawOrnament(ctx, x + width, y, ornamentSize, color);
    // Bottom left
    drawOrnament(ctx, x, y + height, ornamentSize, color);
    // Bottom right
    drawOrnament(ctx, x + width, y + height, ornamentSize, color);
  };
  
  // Helper function to draw corner ornament
  const drawOrnament = (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    
    // Draw curved lines for ornament
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 0.5 * Math.PI);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, 0.5 * Math.PI);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, 0.5 * Math.PI);
    ctx.stroke();
  };
  
  // Helper function to draw ornamental divider
  const drawOrnamentalDivider = (ctx, centerX, y, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(centerX - (width / 2), y);
    ctx.lineTo(centerX + (width / 2), y);
    ctx.stroke();
    
    // Draw ornament in the middle
    ctx.beginPath();
    ctx.arc(centerX, y - 5, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw small lines on sides
    for (let i = 1; i <= 3; i++) {
      const offset = i * 15;
      
      // Left side
      ctx.beginPath();
      ctx.moveTo(centerX - offset, y - 3);
      ctx.lineTo(centerX - offset, y + 3);
      ctx.stroke();
      
      // Right side
      ctx.beginPath();
      ctx.moveTo(centerX + offset, y - 3);
      ctx.lineTo(centerX + offset, y + 3);
      ctx.stroke();
    }
  };
  return (
    <div className="hidden">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default AssetImageGenerator;
