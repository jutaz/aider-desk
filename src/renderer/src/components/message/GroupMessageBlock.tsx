import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { LocalizedString, UsageReportData } from '@common/types';
import { PerformanceProfiler, usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

import { MessageBlock } from './MessageBlock';
import { MessageBar } from './MessageBar';
import { areMessagesEqual } from './utils';

import { Accordion } from '@/components/common/Accordion';
import { GroupMessage, Message, ResponseMessage, ToolMessage, isResponseMessage, isToolMessage, isUserMessage } from '@/types/message';

type Props = {
  baseDir: string;
  taskId: string;
  message: GroupMessage;
  allFiles: string[];
  renderMarkdown: boolean;
  remove?: (message: Message) => void;
  redo?: () => void;
  edit?: (content: string) => void;
};

const GroupMessageBlockComponent = ({ baseDir, taskId, message, allFiles, renderMarkdown, remove, redo, edit }: Props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loadedChildren, setLoadedChildren] = useState<Message[] | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const { trackLazyLoading } = usePerformanceMonitor('GroupMessageBlock');

  // Lazy loading effect
  useEffect(() => {
    if (loadedChildren === null) {
      // Initialize based on message size and whether group is finished
      if (!message.group.finished || message.children.length <= 10) {
        // Unfinished group (streaming) or small thread: load immediately
        setLoadedChildren(message.children);
      } else {
        // Large finished thread: start empty, load on demand
        setLoadedChildren([]);
      }
    }

    if (isOpen && loadedChildren !== null && loadedChildren.length === 0 && message.children.length > 10 && message.group.finished && !isLoadingChildren) {
      // Load children for large finished thread when expanded
      setIsLoadingChildren(true);
      trackLazyLoading('load-start', undefined, message.children.length);
      // Simulate async loading (in real app, this might be fetching from server or heavy computation)
      const loadChildren = async () => {
        const startTime = Date.now();
        // Small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 100));
        setLoadedChildren(message.children);
        setIsLoadingChildren(false);
        const duration = Date.now() - startTime;
        trackLazyLoading('load-end', duration, message.children.length);
      };
      loadChildren();
    }

    return () => {
      // Cleanup: keep loadedChildren to avoid reloading on re-expand
    };
  }, [isOpen, loadedChildren, message.children, message.group.finished, isLoadingChildren]);

  // Sync loadedChildren with message.children for real-time updates
  useEffect(() => {
    if (loadedChildren !== null && (!message.group.finished || loadedChildren.length > 0)) {
      setLoadedChildren(message.children);
    }
  }, [message.children, message.group.finished]);

  const previewMessage = useMemo(() => {
    const childrenToUse = loadedChildren || message.children;
    const messages = childrenToUse.filter((msg) => isResponseMessage(msg) || isToolMessage(msg) || isUserMessage(msg)).reverse();
    return messages[0];
  }, [message.children, loadedChildren]);

  const aggregateUsage = (messages: Message[]): UsageReportData | undefined => {
    const messagesWithUsage: (ResponseMessage | ToolMessage)[] = [];
    let lastMessageWithUsage: ResponseMessage | ToolMessage | undefined;

    // Find all messages with usageReport and the last one
    for (const msg of messages) {
      if ((isResponseMessage(msg) || isToolMessage(msg)) && msg.usageReport) {
        messagesWithUsage.push(msg);
        lastMessageWithUsage = msg;
      }
    }

    if (messagesWithUsage.length === 0) {
      return undefined;
    }

    // Use tokens from the last message with usage
    const lastUsage = lastMessageWithUsage!.usageReport!;

    // Sum costs from all messages with usage
    const totalCost = messagesWithUsage.reduce((sum, msg) => {
      if (isResponseMessage(msg) || isToolMessage(msg)) {
        return sum + (msg.usageReport?.messageCost || 0);
      }
      return sum;
    }, 0);

    return {
      model: lastUsage.model,
      sentTokens: lastUsage.sentTokens,
      receivedTokens: lastUsage.receivedTokens,
      messageCost: totalCost,
      cacheWriteTokens: lastUsage.cacheWriteTokens,
      cacheReadTokens: lastUsage.cacheReadTokens,
    };
  };

  const aggregatedUsage = aggregateUsage(loadedChildren || message.children);

  const getGroupDisplayName = (name?: string | LocalizedString) => {
    if (!name) {
      return t('messages.group');
    }

    if (typeof name === 'string') {
      return t(name || 'messages.group');
    }

    // name is LocalizedString
    return t(name.key, name.params || {});
  };

  const header = (
    <div className={clsx('w-full px-3 py-1 group', !message.group.finished && 'animate-pulse')}>
      <div className="text-xs text-left">{getGroupDisplayName(message.group.name)}</div>
    </div>
  );

  return (
    <PerformanceProfiler componentName="GroupMessageBlock">
      <div className={clsx('bg-bg-secondary border border-border-dark-light rounded-md mb-2 relative')}>
      {/* Color Bar */}
      <div
        className={clsx('absolute left-0 top-0 h-full w-1 rounded-tl-md rounded-bl-md z-10', !message.group.finished && 'animate-pulse')}
        style={{
          backgroundColor: message.group.color,
        }}
      />
      {/* Content */}
      <Accordion
        buttonClassName="rounded-b-none"
        title={header}
        chevronPosition="right"
        noMaxHeight={true}
        showCollapseButton={true}
        isOpen={isOpen}
        scrollToVisibleWhenExpanded={true}
        onOpenChange={(open) => {
          setIsOpen(open);
          trackLazyLoading(open ? 'expand' : 'collapse', undefined, message.children.length);
        }}
      >
        <div className="p-2 pl-3 pb-0.5 bg-bg-primary-light">
          {isLoadingChildren ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-text-muted">{t('common.loading')}</span>
            </div>
          ) : (
            loadedChildren && loadedChildren.map((child, index) => (
              <MessageBlock
                key={child.id || index}
                baseDir={baseDir}
                taskId={taskId}
                message={child}
                allFiles={allFiles}
                renderMarkdown={renderMarkdown}
                remove={remove ? () => remove(child) : undefined}
                redo={redo}
                edit={edit}
              />
            ))
          )}
        </div>
      </Accordion>
      <AnimatePresence>
        {!isOpen && previewMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 32 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden"
          >
            <motion.div
              key={previewMessage.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-0.5 left-6 right-6"
            >
              <MessageBlock baseDir={baseDir} taskId={taskId} message={previewMessage} allFiles={allFiles} renderMarkdown={renderMarkdown} compact={true} />
            </motion.div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-bg-secondary via-bg-secondary to-transparent pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="px-3 pb-3">
        <MessageBar className="mt-0" usageReport={aggregatedUsage} />
      </div>
      </div>
    </PerformanceProfiler>
  );
};

const arePropsEqual = (prevProps: Props, nextProps: Props): boolean => {
  if (
    prevProps.baseDir !== nextProps.baseDir ||
    prevProps.allFiles.length !== nextProps.allFiles.length ||
    prevProps.renderMarkdown !== nextProps.renderMarkdown ||
    (prevProps.remove !== nextProps.remove && (prevProps.remove === undefined) !== (nextProps.remove === undefined)) ||
    (prevProps.redo !== nextProps.redo && (prevProps.redo === undefined) !== (nextProps.redo === undefined)) ||
    (prevProps.edit !== nextProps.edit && (prevProps.edit === undefined) !== (nextProps.edit === undefined))
  ) {
    return false;
  }

  const prevMessage = prevProps.message;
  const nextMessage = nextProps.message;

  // Check basic message properties
  if (prevMessage.id !== nextMessage.id || prevMessage.content !== nextMessage.content) {
    return false;
  }

  // Check group properties
  if (
    prevMessage.group.id !== nextMessage.group.id ||
    prevMessage.group.name !== nextMessage.group.name ||
    prevMessage.group.finished !== nextMessage.group.finished ||
    prevMessage.group.color !== nextMessage.group.color
  ) {
    return false;
  }

  // Check children arrays
  if (prevMessage.children.length !== nextMessage.children.length) {
    return false;
  }

  for (let i = 0; i < prevMessage.children.length; i++) {
    if (!areMessagesEqual(prevMessage.children[i], nextMessage.children[i])) {
      return false;
    }
  }

  return true;
};

export const GroupMessageBlock = memo(GroupMessageBlockComponent, arePropsEqual);
