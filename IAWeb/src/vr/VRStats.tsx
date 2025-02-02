import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh.js';
import Stats from "stats.js";
import { useEffect, useRef } from 'react';
import React from 'react';
import { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import HTMLInteractiveGroup from '../hybrid/HTMLInteractiveGroup';

export default function VRStats() {
    const groupRef = useRef<Group>(null!);

    const statsRef = useRef<any>(null!);
    const statsMesh = useRef<HTMLMesh>(null!);

    useEffect(() => {
        // Add stats.js
        statsRef.current = new Stats();
        statsRef.current.dom.style.width = '80px';
        statsRef.current.dom.style.height = '48px';
        document.body.appendChild(statsRef.current.dom);

        statsMesh.current = new HTMLMesh(statsRef.current.dom);
        statsMesh.current.position.x = - 0.75;
        statsMesh.current.position.y = 2;
        statsMesh.current.position.z = - 0.6;
        statsMesh.current.rotation.y = Math.PI / 4;
        statsMesh.current.scale.setScalar(2.5);
        groupRef.current.add(statsMesh.current);
    }, []);

    useFrame(() => {
        statsRef.current.update();

        // Canvas elements doesn't trigger DOM updates, so we have to update the texture
        statsMesh.current.material.map.update();
    });

    return (
        <HTMLInteractiveGroup ref={groupRef}></HTMLInteractiveGroup>
    )
}