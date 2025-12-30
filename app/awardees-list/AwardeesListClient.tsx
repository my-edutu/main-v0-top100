'use client'

import { useState, useMemo, useEffect } from 'react'
import type { ProofAwardee } from '@/lib/awardees'

interface AwardeesListClientProps {
    awardees: ProofAwardee[]
}

export default function AwardeesListClient({ awardees }: AwardeesListClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [isMobile, setIsMobile] = useState(false)

    // Detect mobile on client side
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Filter awardees based on search
    const filteredAwardees = useMemo(() => {
        if (!searchQuery.trim()) return awardees

        const query = searchQuery.toLowerCase()
        return awardees.filter(
            (a) =>
                a.name.toLowerCase().includes(query) ||
                (a.country && a.country.toLowerCase().includes(query)) ||
                (a.cgpa && a.cgpa.toLowerCase().includes(query))
        )
    }, [awardees, searchQuery])

    // Items per page: 100 on mobile, split into 2 pages on desktop
    const itemsPerPage = isMobile ? 100 : Math.ceil(filteredAwardees.length / 2)

    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(filteredAwardees.length / itemsPerPage))

    // Get current page items
    const paginatedAwardees = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return filteredAwardees.slice(startIndex, endIndex)
    }, [filteredAwardees, currentPage, itemsPerPage])

    return (
        <main style={{
            padding: '20px',
            maxWidth: '800px',
            margin: '0 auto',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '8px',
                textAlign: 'center'
            }}>
                Top 100 Africa Future Leaders
            </h1>
            <p style={{
                textAlign: 'center',
                color: '#666',
                marginBottom: '8px',
                fontSize: '14px'
            }}>
                Official Merit List
            </p>
            <p style={{
                textAlign: 'center',
                color: '#888',
                marginBottom: '16px',
                fontSize: '12px'
            }}>
                Total Awardees: {awardees.length}
            </p>

            {/* Search Bar */}
            <div style={{ marginBottom: '16px' }}>
                <input
                    type="text"
                    placeholder="Search by name, country, or CGPA..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1) // Reset to page 1 when searching
                    }}
                    style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            {/* Results count */}
            {searchQuery && (
                <p style={{
                    textAlign: 'center',
                    color: '#666',
                    marginBottom: '12px',
                    fontSize: '12px'
                }}>
                    Found {filteredAwardees.length} result{filteredAwardees.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* Table */}
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
            }}>
                <thead>
                    <tr style={{
                        borderBottom: '2px solid #333',
                        textAlign: 'left'
                    }}>
                        <th style={{ padding: '8px 4px', fontWeight: '600' }}>#</th>
                        <th style={{ padding: '8px 4px', fontWeight: '600' }}>Name</th>
                        <th style={{ padding: '8px 4px', fontWeight: '600' }}>CGPA</th>
                        <th style={{ padding: '8px 4px', fontWeight: '600' }}>Country</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedAwardees.map((awardee, index) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1
                        return (
                            <tr
                                key={awardee.id || index}
                                style={{
                                    borderBottom: '1px solid #eee'
                                }}
                            >
                                <td style={{ padding: '8px 4px', color: '#888' }}>{globalIndex}</td>
                                <td style={{ padding: '8px 4px' }}>{awardee.name}</td>
                                <td style={{ padding: '8px 4px' }}>{awardee.cgpa || '-'}</td>
                                <td style={{ padding: '8px 4px' }}>{awardee.country || '-'}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {paginatedAwardees.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                    No awardees found.
                </p>
            )}

            {/* Pagination */}
            {filteredAwardees.length > 0 && totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '24px',
                    paddingBottom: '20px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                            color: currentPage === 1 ? '#999' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        ← Previous
                    </button>

                    <span style={{ color: '#666', fontSize: '14px' }}>
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#fff',
                            color: currentPage === totalPages ? '#999' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Next →
                    </button>
                </div>
            )}
        </main>
    )
}
