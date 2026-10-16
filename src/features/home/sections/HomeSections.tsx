import React from 'react';
import { usePublishedSections } from '../api/sections';
import { sectionTypeDefinition, sectionsForAnchor, type SectionAnchor } from './registry';

/**
 * A homepage section anchor: the slot in HomePage's composition
 * where console-managed sections of the anchored types render.
 *
 * The fallback contract is the homepage's safety rule: while the sections
 * read is in flight, and whenever it fails (the sections table is not on
 * the host yet, a network hiccup), the anchor renders `fallback` - the
 * built-in composition - so the page is never blank over a CMS table.
 * Once the read succeeds it is honoured exactly: the anchor renders its
 * published sections in console order, or nothing when the console has
 * none for it (an admin disabled or deleted them).
 */
export interface HomeSectionAnchorProps {
  anchor: SectionAnchor;
  fallback?: React.ReactNode;
}

export const HomeSectionAnchor: React.FC<HomeSectionAnchorProps> = ({
  anchor,
  fallback = null,
}) => {
  const state = usePublishedSections();

  if (state.status !== 'ready') return <>{fallback}</>;

  const sections = sectionsForAnchor(state.sections, anchor);
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => {
        const Component = sectionTypeDefinition(section.type)?.component;
        if (!Component) return null;
        return <Component key={section.id} section={section} />;
      })}
    </>
  );
};
