import React from 'react';
import { useApp } from '../../context/AppContext';
import { MethodSelectionStep } from './MethodSelectionStep';
import { VoiceRecordingStep } from './VoiceRecordingStep';
import { TextDescriptionStep } from './TextDescriptionStep';
import { AIProcessingStep } from './AIProcessingStep';
import { ReviewComplaintStep } from './ReviewComplaintStep';
import { SubmittedSuccessStep } from './SubmittedSuccessStep';

export const RaiseComplaintPage: React.FC = () => {
  const { complaintDraft } = useApp();

  switch (complaintDraft.step) {
    case 'method-selection':
      return <MethodSelectionStep />;
    case 'voice-recording':
    case 'record':
      return complaintDraft.mode === 'text' ? <TextDescriptionStep /> : <VoiceRecordingStep />;
    case 'text-description':
      return <TextDescriptionStep />;
    case 'ai-processing':
      return <AIProcessingStep />;
    case 'review':
      return <ReviewComplaintStep />;
    case 'success':
      return <SubmittedSuccessStep />;
    default:
      return <MethodSelectionStep />;
  }
};
