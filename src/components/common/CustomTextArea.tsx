import React, { forwardRef, TextareaHTMLAttributes, ChangeEvent } from 'react';

interface CustomTextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'onChange'> {
  label?: string;
  error?: string;
  variant?: 'default' | 'modern' | 'minimal';
  resize?: boolean;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

const CustomTextArea = forwardRef<HTMLTextAreaElement, CustomTextAreaProps>(
  ({ label, error, variant = 'modern', resize = true, ...props }, ref) => {
    const baseClasses = `
      w-full px-4 py-3 text-sm
      border rounded-lg
      transition-all duration-200 ease-in-out
      focus:outline-none
      placeholder:text-gray-400
      ${resize ? 'resize-vertical' : 'resize-none'}
      relative
    `;

    const variantClasses: Record<typeof variant, string> = {
      default: `
        border-gray-300 bg-white
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
        hover:border-gray-400
      `,
      modern: `
        border-gray-200 bg-gray-50/50
        focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 focus:bg-white
        hover:border-gray-300 hover:bg-gray-50
        shadow-sm
      `,
      minimal: `
        border-gray-200 bg-transparent
        focus:border-gray-400 focus:bg-gray-50/30
        hover:border-gray-300
      `
    };

    const errorClasses = error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30'
      : '';

    const textareaClasses = `
      ${baseClasses}
      ${variantClasses[variant]}
      ${errorClasses}
    `.replace(/\s+/g, ' ').trim();

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <div className="relative">
            <textarea
              ref={ref}
              className={`${textareaClasses} ${resize ? '[&::-webkit-resizer]:appearance-none [&::-webkit-resizer]:hidden' : ''}`}
              style={{
                // ブラウザのデフォルトリサイズハンドルを隠す
                resize: resize ? 'vertical' : 'none',
              }}
              {...props}
            />
            {/* カスタムネイティブ風リサイズハンドル */}
            {resize && (
              <div className="absolute bottom-0 right-0 w-4 h-4 opacity-50 hover:opacity-80 transition-opacity pointer-events-none">
                {/* 斜めライン風のネイティブハンドル - 角にぴったり配置 */}
                <svg
                  viewBox="0 0 16 16"
                  className="w-full h-full text-gray-500"
                  fill="currentColor"
                >
                  <path d="M16 14L14 16H16V14ZM16 11L11 16H13L16 13V11ZM16 8L8 16H10L16 10V8ZM16 5L5 16H7L16 7V5Z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

CustomTextArea.displayName = 'CustomTextArea';

export default CustomTextArea;