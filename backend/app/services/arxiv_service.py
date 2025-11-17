"""
arXiv API service for fetching research papers.
"""
import arxiv
from typing import List, Dict, Any
from datetime import datetime


class ArxivService:
    """Service for fetching papers from arXiv."""

    def __init__(self):
        self.client = arxiv.Client()

    async def search_papers(
        self,
        query: str,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for papers on arXiv.

        Args:
            query: Search query string
            max_results: Maximum number of papers to return

        Returns:
            List of paper metadata dictionaries
        """
        try:
            # Create search
            search = arxiv.Search(
                query=query,
                max_results=max_results,
                sort_by=arxiv.SortCriterion.Relevance,
                sort_order=arxiv.SortOrder.Descending
            )

            # Fetch results
            papers = []
            for result in self.client.results(search):
                paper = {
                    'title': result.title,
                    'authors': [author.name for author in result.authors],
                    'summary': result.summary,
                    'published': result.published.isoformat() if result.published else None,
                    'updated': result.updated.isoformat() if result.updated else None,
                    'url': result.entry_id,
                    'pdf_url': result.pdf_url,
                    'categories': result.categories,
                    'primary_category': result.primary_category,
                }
                papers.append(paper)

            return papers

        except Exception as e:
            print(f"Error fetching from arXiv: {e}")
            return []

    async def get_paper_by_id(self, arxiv_id: str) -> Dict[str, Any]:
        """
        Get a specific paper by its arXiv ID.

        Args:
            arxiv_id: arXiv paper ID (e.g., "2301.00001")

        Returns:
            Paper metadata dictionary
        """
        try:
            search = arxiv.Search(id_list=[arxiv_id])
            result = next(self.client.results(search))

            return {
                'title': result.title,
                'authors': [author.name for author in result.authors],
                'summary': result.summary,
                'published': result.published.isoformat() if result.published else None,
                'updated': result.updated.isoformat() if result.updated else None,
                'url': result.entry_id,
                'pdf_url': result.pdf_url,
                'categories': result.categories,
                'primary_category': result.primary_category,
            }

        except Exception as e:
            print(f"Error fetching paper {arxiv_id}: {e}")
            return None

    def format_paper_citation(self, paper: Dict[str, Any]) -> str:
        """
        Format a paper as a citation string.

        Args:
            paper: Paper metadata dictionary

        Returns:
            Formatted citation string
        """
        authors = paper.get('authors', [])
        if len(authors) > 3:
            author_str = f"{authors[0]} et al."
        else:
            author_str = ', '.join(authors)

        year = paper.get('published', '')[:4] if paper.get('published') else 'N/A'

        return f"{author_str} ({year}). {paper.get('title')}. arXiv:{paper.get('url').split('/')[-1]}."


# Global service instance
arxiv_service = ArxivService()
