import {PROJECT_LINKS as P,PROJECT_REPO_URL,newIssueUrl} from '../help/projectLinks';

/** The source code and Report a problem buttons at the foot of the header (projectLinks.ts) [W]. `page` is the current route. */
export default function ProjectLinks({page}:{page:string}){
 return <div className="project-links" role="group" aria-label={P.groupLabel} data-testid="project-links">
  <a href={PROJECT_REPO_URL} target="_blank" rel="noopener noreferrer" data-testid="project-repo">
   <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><path d="M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4"/></svg>
   {P.repo}<span className="visually-hidden"> {P.newTab}</span></a>
  <a href={newIssueUrl(page)} target="_blank" rel="noopener noreferrer" data-testid="project-report">
   <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.25"/><path d="M8 4.75v4M8 11.1v.15"/></svg>
   {P.report}<span className="visually-hidden"> {P.newTab}</span></a>
 </div>;
}
