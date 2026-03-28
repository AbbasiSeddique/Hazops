import { useState, useEffect, useCallback } from "react";
import { getStudy, getStudies, getNodes, getDeviations } from "../lib/api";

export function useStudySession(initialStudyId = null) {
  const [studies, setStudies] = useState([]);
  const [currentStudy, setCurrentStudy] = useState(null);
  const [currentStudyId, setCurrentStudyId] = useState(initialStudyId);
  const [nodes, setNodes] = useState([]);
  const [deviations, setDeviations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshStudies = useCallback(async () => {
    try {
      const data = await getStudies();
      setStudies(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadStudy = useCallback(async (studyId) => {
    if (!studyId) return;
    setIsLoading(true);
    setError(null);

    try {
      const study = await getStudy(studyId);
      setCurrentStudy(study);
      setCurrentStudyId(studyId);

      const nodeList = await getNodes(studyId);
      setNodes(nodeList);

      const allDeviations = [];
      for (const node of nodeList) {
        try {
          const nodeDeviations = await getDeviations(studyId, node.node_id);
          allDeviations.push(
            ...nodeDeviations.map((d) => ({ ...d, node_name: node.name }))
          );
        } catch {
          // Some nodes may not have deviations yet
        }
      }
      setDeviations(allDeviations);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshNodes = useCallback(async () => {
    if (!currentStudyId) return;
    try {
      const nodeList = await getNodes(currentStudyId);
      setNodes(nodeList);
    } catch (err) {
      setError(err.message);
    }
  }, [currentStudyId]);

  const refreshDeviations = useCallback(async () => {
    if (!currentStudyId || nodes.length === 0) return;
    try {
      const allDeviations = [];
      for (const node of nodes) {
        try {
          const nodeDeviations = await getDeviations(currentStudyId, node.node_id);
          allDeviations.push(
            ...nodeDeviations.map((d) => ({ ...d, node_name: node.name }))
          );
        } catch {
          // Skip nodes without deviations
        }
      }
      setDeviations(allDeviations);
    } catch (err) {
      setError(err.message);
    }
  }, [currentStudyId, nodes]);

  useEffect(() => {
    refreshStudies();
  }, [refreshStudies]);

  useEffect(() => {
    if (currentStudyId) {
      loadStudy(currentStudyId);
    }
  }, [currentStudyId, loadStudy]);

  return {
    studies,
    currentStudy,
    currentStudyId,
    setCurrentStudyId,
    nodes,
    deviations,
    isLoading,
    error,
    refreshStudies,
    refreshNodes,
    refreshDeviations,
    loadStudy,
  };
}
