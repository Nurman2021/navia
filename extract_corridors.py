#!/usr/bin/env python3
"""
Extract corridor polygons from lantai-4-area.geojson
and convert to centerline pathways with detailed waypoints
"""

import json
import math
from typing import List, Tuple

def extract_polygon_centerline(coords: List[List[float]]) -> List[Tuple[float, float]]:
    """
    Extract centerline from polygon coordinates
    For a polygon, we sample points along the centerline
    """
    if len(coords) < 3:
        return []
    
    # Remove duplicate last point if exists
    if coords[0] == coords[-1]:
        coords = coords[:-1]
    
    # For simple polygons, compute rough centerline by averaging opposite edges
    centerline = []
    
    # Sample multiple points along the path
    num_samples = max(20, len(coords) * 2)
    for i in range(num_samples):
        # Interpolate along polygon perimeter
        t = i / num_samples
        idx = int(t * len(coords)) % len(coords)
        next_idx = (idx + 1) % len(coords)
        
        # Get current and next vertex
        p1 = coords[idx]
        p2 = coords[next_idx]
        
        # Linear interpolation
        local_t = (t * len(coords)) % 1.0
        x = p1[0] + (p2[0] - p1[0]) * local_t
        y = p1[1] + (p2[1] - p1[1]) * local_t
        
        centerline.append([x, y])
    
    return centerline

def simplify_linestring(points: List[List[float]], max_points: int = 25) -> List[List[float]]:
    """
    Simplify linestring to max_points by removing less important intermediate points
    """
    if len(points) <= max_points:
        return points
    
    # Keep start and end points
    result = [points[0]]
    
    # Compute importance score for each point (based on direction change)
    importance = [0.0]  # First point always kept
    
    for i in range(1, len(points) - 1):
        p1 = points[i - 1]
        p2 = points[i]
        p3 = points[i + 1]
        
        # Vector from p1 to p2
        v1 = (p2[0] - p1[0], p2[1] - p1[1])
        # Vector from p2 to p3
        v2 = (p3[0] - p2[0], p3[1] - p2[1])
        
        # Angle between vectors (cross product magnitude)
        cross = abs(v1[0] * v2[1] - v1[1] * v2[0])
        importance.append(cross)
    
    importance.append(float('inf'))  # Last point always kept
    
    # Select top points by importance
    indexed = [(imp, i) for i, imp in enumerate(importance)]
    indexed.sort(reverse=True)
    
    selected_indices = set()
    selected_indices.add(0)  # Start
    selected_indices.add(len(points) - 1)  # End
    
    # Add most important points
    for imp, idx in indexed[:max_points - 2]:
        selected_indices.add(idx)
    
    # Sort by original order
    selected = [points[i] for i in sorted(selected_indices)]
    return selected

def main():
    # Load area data
    with open('public/khadijah-floor/lantai-4-area.geojson', 'r') as f:
        area_data = json.load(f)
    
    # Find KORIDOR and TANGGA features
    corridors = []
    for feature in area_data['features']:
        props = feature.get('properties', {})
        ruangan = props.get('RUANGAN', '')
        
        if ruangan in ['KORIDOR', 'TANGGA', 'LIFT']:
            geom = feature.get('geometry', {})
            if geom.get('type') == 'MultiPolygon':
                # MultiPolygon - use first polygon
                coords = geom['coordinates'][0][0]
                corridors.append({
                    'name': ruangan,
                    'coords': coords
                })
            elif geom.get('type') == 'Polygon':
                # Polygon
                coords = geom['coordinates'][0]
                corridors.append({
                    'name': ruangan,
                    'coords': coords
                })
    
    print(f"\nFound {len(corridors)} corridor features:")
    for i, corr in enumerate(corridors):
        print(f"  {i+1}. {corr['name']} - {len(corr['coords'])} vertices")
        
        # Extract and simplify centerline
        centerline = extract_polygon_centerline(corr['coords'])
        simplified = simplify_linestring(centerline, max_points=20)
        
        print(f"     Original centerline: {len(centerline)} points")
        print(f"     Simplified: {len(simplified)} waypoints")
        print(f"     First waypoint: [{simplified[0][0]:.1f}, {simplified[0][1]:.1f}]")
        print(f"     Last waypoint: [{simplified[-1][0]:.1f}, {simplified[-1][1]:.1f}]")
        
        # Print GeoJSON format
        coords_str = "[\n"
        for x, y in simplified:
            coords_str += f"          [{x:.1f}, {y:.1f}],\n"
        coords_str = coords_str.rstrip(',\n') + "\n        ]"
        print(f"     GeoJSON coords: {coords_str}\n")

if __name__ == '__main__':
    main()
