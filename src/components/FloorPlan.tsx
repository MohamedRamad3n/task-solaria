import { useEffect, useState, useRef } from 'react';
import floorPlanSvg from '../assets/0-floor.svg';
import polygonData from '../assets/data.json';
import './FloorPlan.css';

interface PolygonData {
  code: number;
  status: 'available' | 'reserved' | 'sold';
  price: number;
}

interface FilterState {
  status: string[];
  priceRange: number;
}

export const FloorPlan = () => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [hoveredPolygon, setHoveredPolygon] = useState<PolygonData | null>(null);
  const [selectedPolygon, setSelectedPolygon] = useState<PolygonData | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: ['available', 'reserved', 'sold'],
    priceRange: 100000
  });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(floorPlanSvg)
      .then(response => response.text())
      .then(svg => {
        setSvgContent(svg);
      });
  }, []);



  useEffect(() => {
    if (!svgContent) return;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

    const polygons = svgDoc.querySelectorAll('polygon');

    polygons.forEach(polygon => {
      const code = parseInt(polygon.getAttribute('data-code') || '0');
      const polygonInfo = polygonData.find(p => p.code === code) as PolygonData | undefined;

      if (polygonInfo) {
        //determine whether this polygon should be visible based on filters
        const isVisible = filters.status.includes(polygonInfo.status) &&
          polygonInfo.price <= filters.priceRange;

        polygon.style.display = isVisible ? 'block' : 'none';

        // Remove previous listeners to avoid stacking
        polygon.replaceWith(polygon.cloneNode(true));
        const newPolygon = svgDoc.querySelector(`polygon[data-code="${code}"]`) as SVGElement;
        if (!newPolygon) return;

        // Add hover and click event listeners
        newPolygon.addEventListener('mouseenter', (e) => handlePolygonHover(code, e));
        newPolygon.addEventListener('mousemove', (e) => handlePolygonHover(code, e));
        newPolygon.addEventListener('mouseleave', () => handlePolygonLeave(code));
        newPolygon.addEventListener('click', () => handlePolygonClick(code));

        // Set color based on status
        switch (polygonInfo.status) {
          case 'available':
            newPolygon.setAttribute('fill', '#e6f0ff');
            newPolygon.setAttribute('stroke', '#3271cc');
            newPolygon.setAttribute('stroke-width', '1.5');
            break;
          case 'reserved':
            newPolygon.setAttribute('fill', '#fff4e6');
            newPolygon.setAttribute('stroke', '#ffa500');
            newPolygon.setAttribute('stroke-width', '1.5');
            break;
          case 'sold':
            newPolygon.setAttribute('fill', '#ffe6e6');
            newPolygon.setAttribute('stroke', '#ff0000');
            newPolygon.setAttribute('stroke-width', '1.5');
            break;
        }

        // Add accessibility attributes
        newPolygon.setAttribute('role', 'button');
        newPolygon.setAttribute('tabindex', '0');//makes it focusable via keyboard
        newPolygon.setAttribute('aria-label', `Unit ${code} - ${polygonInfo.status} - $${polygonInfo.price.toLocaleString()}`);

        (newPolygon as SVGElement).style.transition = 'fill 0.3s ease, stroke 0.3s ease, filter 0.3s ease, transform 0.3s ease';
      }
    });

    if (svgContainerRef.current) {
      svgContainerRef.current.innerHTML = '';
      svgContainerRef.current.appendChild(svgDoc.documentElement);
    }
  }, [svgContent, filters, selectedPolygon]);

  const handlePolygonHover = (code: number, e: Event) => {
    const polygonInfo = polygonData.find(p => p.code === code) as PolygonData | undefined;
    setHoveredPolygon(polygonInfo || null);

    // Get mouse position relative to the container
    if (e && 'clientX' in e && 'clientY' in e) {
      const container = svgContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setPopupPos({
          x: (e as MouseEvent).clientX - rect.left,
          y: (e as MouseEvent).clientY - rect.top
        });
      }
    }

    // Add hover effect to the polygon
    const polygon = document.querySelector(`polygon[data-code="${code}"]`) as SVGElement;
    if (polygon && !polygon.classList.contains('selected')) {
      polygon.style.filter = 'brightness(1.2) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))';
      polygon.style.cursor = 'pointer';
    }
  };

  const handlePolygonLeave = (code: number) => {
    setHoveredPolygon(null);
    setPopupPos(null);

    // Remove hover effect from the polygon if it's not selected
    const polygon = document.querySelector(`polygon[data-code="${code}"]`) as SVGElement;
    if (polygon && !polygon.classList.contains('selected')) {
      polygon.style.filter = 'none';
      polygon.style.cursor = 'pointer';
    }
  };

  const handlePolygonClick = (code: number) => {
    const polygonInfo = polygonData.find(p => p.code === code) as PolygonData | undefined;

    if (selectedPolygon?.code === code) {
      // Deselect if clicking the same polygon
      setSelectedPolygon(null);
      const polygon = document.querySelector(`polygon[data-code="${code}"]`) as SVGElement;
      if (polygon) {
        polygon.classList.remove('selected');
      }
    } else {
      // Deselect previous polygon
      if (selectedPolygon) {
        const prevPolygon = document.querySelector(`polygon[data-code="${selectedPolygon.code}"]`) as SVGElement;
        if (prevPolygon) {
          prevPolygon.classList.remove('selected');
        }
      }

      // Select new polygon
      setSelectedPolygon(polygonInfo || null);
      const polygon = document.querySelector(`polygon[data-code="${code}"]`) as SVGElement;
      if (polygon) {
        polygon.classList.add('selected');
      }
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const handlePriceRangeChange = (value: number) => {
    setFilters(prev => ({
      ...prev,
      priceRange: value
    }));
  };

  return (
    <div className="floor-plan">
      <div className="filters">
        <div className="status-filters">
          <div className="filter-group">
            <h3>Status</h3>
            <div className="checkbox-group">
              <label className="status-label available">
                <input
                  type="checkbox"
                  checked={filters.status.includes('available')}
                  onChange={() => handleStatusFilterChange('available')}
                />
                <span className="status-dot"></span>
                Available
              </label>
              <label className="status-label reserved">
                <input
                  type="checkbox"
                  checked={filters.status.includes('reserved')}
                  onChange={() => handleStatusFilterChange('reserved')}
                />
                <span className="status-dot"></span>
                Reserved
              </label>
              <label className="status-label sold">
                <input
                  type="checkbox"
                  checked={filters.status.includes('sold')}
                  onChange={() => handleStatusFilterChange('sold')}
                />
                <span className="status-dot"></span>
                Sold
              </label>
            </div>
          </div>
          <div className="filter-group">
            <h3>Price Range</h3>
            <div className="price-range">
              <input
                type="range"
                min="0"
                max="100000"
                value={filters.priceRange}
                onChange={(e) => handlePriceRangeChange(parseInt(e.target.value))}
                className="range-input"
              />
              <div className="price-value">
                ${filters.priceRange.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="floor-plan-container">
        <div ref={svgContainerRef} className="floor-plan-svg" />
        {hoveredPolygon && popupPos && (
          <div
            className="polygon-info polygon-info-arrow"
            style={{
              left: `${popupPos.x + 20}px`,
              top: `${popupPos.y - 20}px`
            }}
          >
            <div className="arrow"></div>
            <h3>
              Unit {hoveredPolygon.code}
              <span className={`status-dot ${hoveredPolygon.status}`}></span>
            </h3>
            <div className="info-content">
              <div className="info-row">
                <span className="label">Status</span>
                <span className={`value status-${hoveredPolygon.status}`}>
                  {hoveredPolygon.status.charAt(0).toUpperCase() + hoveredPolygon.status.slice(1)}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Price</span>
                <span className="value">${hoveredPolygon.price.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 