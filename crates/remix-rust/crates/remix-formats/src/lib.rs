use byteorder::{LittleEndian, WriteBytesExt};
use glam::Vec3;
use remix_core::types::MeshData;

pub mod obj {
    use super::*;

    pub fn parse_obj(obj_content: &str) -> MeshData {
        let mut raw_positions = Vec::new();
        let mut raw_normals = Vec::new();
        let mut raw_uvs = Vec::new();

        let mut mesh = MeshData::default();

        for line in obj_content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            let mut parts = line.split_whitespace();
            match parts.next() {
                Some("v") => {
                    if let (Some(x), Some(y), Some(z)) = (parts.next(), parts.next(), parts.next()) {
                        if let (Ok(x), Ok(y), Ok(z)) = (x.parse::<f32>(), y.parse::<f32>(), z.parse::<f32>()) {
                            raw_positions.push([x, y, z]);
                        }
                    }
                }
                Some("vn") => {
                    if let (Some(x), Some(y), Some(z)) = (parts.next(), parts.next(), parts.next()) {
                        if let (Ok(x), Ok(y), Ok(z)) = (x.parse::<f32>(), y.parse::<f32>(), z.parse::<f32>()) {
                            raw_normals.push([x, y, z]);
                        }
                    }
                }
                Some("vt") => {
                    if let (Some(u), Some(v)) = (parts.next(), parts.next()) {
                        if let (Ok(u), Ok(v)) = (u.parse::<f32>(), v.parse::<f32>()) {
                            raw_uvs.push([u, v]);
                        }
                    }
                }
                Some("f") => {
                    let face_vertices: Vec<&str> = parts.collect();
                    if face_vertices.len() >= 3 {
                        // Triangulate fan
                        for i in 1..(face_vertices.len() - 1) {
                            for &fv in &[face_vertices[0], face_vertices[i], face_vertices[i + 1]] {
                                let indices: Vec<&str> = fv.split('/').collect();
                                let v_idx = indices[0].parse::<usize>().unwrap_or(1) - 1;
                                let pos = raw_positions.get(v_idx).copied().unwrap_or([0.0, 0.0, 0.0]);
                                let uv = indices.get(1).and_then(|s| s.parse::<usize>().ok()).and_then(|idx| raw_uvs.get(idx - 1)).copied().unwrap_or([0.0, 0.0]);
                                let norm = indices.get(2).and_then(|s| s.parse::<usize>().ok()).and_then(|idx| raw_normals.get(idx - 1)).copied().unwrap_or([0.0, 1.0, 0.0]);

                                let new_idx = mesh.positions.len() as u32;
                                mesh.positions.push(pos);
                                mesh.normals.push(norm);
                                mesh.uvs.push(uv);
                                mesh.indices.push(new_idx);
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        mesh
    }
}

pub mod glb {
    use super::*;

    /// Packages MeshData into a standard binary glTF (GLB) buffer
    pub fn export_glb(mesh: &MeshData) -> Vec<u8> {
        let mut binary_buffer = Vec::new();

        // Write positions
        let pos_byte_offset = binary_buffer.len();
        let mut min_pos = Vec3::splat(f32::INFINITY);
        let mut max_pos = Vec3::splat(f32::NEG_INFINITY);
        for p in &mesh.positions {
            let v = Vec3::from_array(*p);
            min_pos = min_pos.min(v);
            max_pos = max_pos.max(v);
            let _ = binary_buffer.write_f32::<LittleEndian>(p[0]);
            let _ = binary_buffer.write_f32::<LittleEndian>(p[1]);
            let _ = binary_buffer.write_f32::<LittleEndian>(p[2]);
        }
        let pos_byte_length = binary_buffer.len() - pos_byte_offset;

        // Write normals
        let norm_byte_offset = binary_buffer.len();
        for n in &mesh.normals {
            let _ = binary_buffer.write_f32::<LittleEndian>(n[0]);
            let _ = binary_buffer.write_f32::<LittleEndian>(n[1]);
            let _ = binary_buffer.write_f32::<LittleEndian>(n[2]);
        }
        let norm_byte_length = binary_buffer.len() - norm_byte_offset;

        // Write UVs
        let uv_byte_offset = binary_buffer.len();
        for uv in &mesh.uvs {
            let _ = binary_buffer.write_f32::<LittleEndian>(uv[0]);
            let _ = binary_buffer.write_f32::<LittleEndian>(uv[1]);
        }
        let uv_byte_length = binary_buffer.len() - uv_byte_offset;

        // Write indices (u32)
        let idx_byte_offset = binary_buffer.len();
        for idx in &mesh.indices {
            let _ = binary_buffer.write_u32::<LittleEndian>(*idx);
        }
        let idx_byte_length = binary_buffer.len() - idx_byte_offset;

        // 4-byte padding for binary buffer
        while binary_buffer.len() % 4 != 0 {
            binary_buffer.push(0x00);
        }

        let json_header = serde_json::json!({
            "asset": { "version": "2.0", "generator": "Remix-Rust-v14" },
            "scenes": [{ "nodes": [0] }],
            "nodes": [{ "mesh": 0 }],
            "meshes": [{
                "primitives": [{
                    "attributes": {
                        "POSITION": 0,
                        "NORMAL": 1,
                        "TEXCOORD_0": 2
                    },
                    "indices": 3,
                    "mode": 4
                }]
            }],
            "accessors": [
                {
                    "bufferView": 0, "byteOffset": 0, "componentType": 5126,
                    "count": mesh.positions.len(), "type": "VEC3",
                    "max": [max_pos.x, max_pos.y, max_pos.z],
                    "min": [min_pos.x, min_pos.y, min_pos.z]
                },
                {
                    "bufferView": 1, "byteOffset": 0, "componentType": 5126,
                    "count": mesh.normals.len(), "type": "VEC3"
                },
                {
                    "bufferView": 2, "byteOffset": 0, "componentType": 5126,
                    "count": mesh.uvs.len(), "type": "VEC2"
                },
                {
                    "bufferView": 3, "byteOffset": 0, "componentType": 5125,
                    "count": mesh.indices.len(), "type": "SCALAR"
                }
            ],
            "bufferViews": [
                { "buffer": 0, "byteOffset": pos_byte_offset, "byteLength": pos_byte_length, "target": 34962 },
                { "buffer": 0, "byteOffset": norm_byte_offset, "byteLength": norm_byte_length, "target": 34962 },
                { "buffer": 0, "byteOffset": uv_byte_offset, "byteLength": uv_byte_length, "target": 34962 },
                { "buffer": 0, "byteOffset": idx_byte_offset, "byteLength": idx_byte_length, "target": 34963 }
            ],
            "buffers": [
                { "byteLength": binary_buffer.len() }
            ]
        });

        let mut json_bytes = serde_json::to_vec(&json_header).unwrap();
        while json_bytes.len() % 4 != 0 {
            json_bytes.push(b' ');
        }

        // Assembly of standard GLB binary container
        let mut glb = Vec::new();
        let total_length = 12 + 8 + json_bytes.len() + 8 + binary_buffer.len();

        // GLB Header
        let _ = glb.write_u32::<LittleEndian>(0x46546C67); // "glTF"
        let _ = glb.write_u32::<LittleEndian>(2);          // version 2
        let _ = glb.write_u32::<LittleEndian>(total_length as u32);

        // Chunk 0: JSON
        let _ = glb.write_u32::<LittleEndian>(json_bytes.len() as u32);
        let _ = glb.write_u32::<LittleEndian>(0x4E4F534A); // "JSON"
        glb.extend_from_slice(&json_bytes);

        // Chunk 1: BIN
        let _ = glb.write_u32::<LittleEndian>(binary_buffer.len() as u32);
        let _ = glb.write_u32::<LittleEndian>(0x004E4942); // "BIN\0"
        glb.extend_from_slice(&binary_buffer);

        glb
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_obj_parser() {
        let sample_obj = "
            v 0.0 0.0 0.0
            v 1.0 0.0 0.0
            v 0.0 1.0 0.0
            vn 0.0 0.0 1.0
            vt 0.0 0.0
            vt 1.0 0.0
            vt 0.0 1.0
            f 1/1/1 2/2/1 3/3/1
        ";
        let mesh = obj::parse_obj(sample_obj);
        assert_eq!(mesh.positions.len(), 3);
        assert_eq!(mesh.indices.len(), 3);
    }

    #[test]
    fn test_glb_export() {
        let mut mesh = MeshData::default();
        mesh.positions = vec![[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0]];
        mesh.normals = vec![[0.0, 0.0, 1.0]; 3];
        mesh.uvs = vec![[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]];
        mesh.indices = vec![0, 1, 2];

        let glb_bytes = glb::export_glb(&mesh);
        assert!(glb_bytes.len() > 20);
        // Header magic "glTF"
        assert_eq!(&glb_bytes[0..4], b"glTF");
    }
}
