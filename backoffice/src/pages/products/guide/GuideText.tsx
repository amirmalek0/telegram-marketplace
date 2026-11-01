import { ChevronLeft } from 'lucide-react';
import { Fragment } from 'react';
import { guidePoints, guideTextParts } from './guideTextParsing';

export function GuidePath({ children }: { children: string }) {
  return <span className="product-guide-path">{children.split('←').map((part, index) => <Fragment key={index}>{index > 0 && <ChevronLeft size={12} aria-hidden="true" />}<span>{part.trim()}</span></Fragment>)}</span>;
}

export function GuideText({ children }: { children: string }) {
  return <>{guideTextParts(children).map((part, index) => part.isControl ? <GuidePath key={index}>{part.text}</GuidePath> : <Fragment key={index}>{part.text}</Fragment>)}</>;
}

export function GuidePoints({ text }: { text: string }) {
  return <ul className="product-guide-points">{guidePoints(text).map((point, index) => <li key={index}><GuideText>{point}</GuideText></li>)}</ul>;
}
