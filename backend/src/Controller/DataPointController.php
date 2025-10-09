<?php

namespace App\Controller;

use App\Entity\DataPoint;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/data', name: 'api_data_')]
class DataPointController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {
    }

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $category = $request->query->get('category');
        $startDate = $request->query->get('startDate');
        $endDate = $request->query->get('endDate');

        $queryBuilder = $this->entityManager->getRepository(DataPoint::class)
            ->createQueryBuilder('d')
            ->where('d.user = :user')
            ->setParameter('user', $user)
            ->orderBy('d.timestamp', 'ASC');

        if ($category) {
            $queryBuilder->andWhere('d.category = :category')
                ->setParameter('category', $category);
        }

        if ($startDate) {
            $queryBuilder->andWhere('d.timestamp >= :startDate')
                ->setParameter('startDate', new \DateTime($startDate));
        }

        if ($endDate) {
            $queryBuilder->andWhere('d.timestamp <= :endDate')
                ->setParameter('endDate', new \DateTime($endDate));
        }

        $dataPoints = $queryBuilder->getQuery()->getResult();

        return $this->json(array_map(function (DataPoint $dataPoint) {
            return [
                'id' => $dataPoint->getId(),
                'timestamp' => $dataPoint->getTimestamp()->format('c'),
                'category' => $dataPoint->getCategory(),
                'value' => $dataPoint->getValue(),
                'unit' => $dataPoint->getUnit(),
                'notes' => $dataPoint->getNotes(),
            ];
        }, $dataPoints));
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['timestamp'], $data['category'], $data['value'])) {
            return $this->json(['error' => 'Missing required fields'], Response::HTTP_BAD_REQUEST);
        }

        $dataPoint = new DataPoint();
        $dataPoint->setUser($user);
        $dataPoint->setTimestamp(new \DateTime($data['timestamp']));
        $dataPoint->setCategory($data['category']);
        $dataPoint->setValue((float) $data['value']);

        if (isset($data['unit'])) {
            $dataPoint->setUnit($data['unit']);
        }

        if (isset($data['notes'])) {
            $dataPoint->setNotes($data['notes']);
        }

        $this->entityManager->persist($dataPoint);
        $this->entityManager->flush();

        return $this->json([
            'message' => 'Data point created successfully',
            'id' => $dataPoint->getId(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/upload', name: 'upload', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $file = $request->files->get('file');
        if (!$file) {
            return $this->json(['error' => 'No file uploaded'], Response::HTTP_BAD_REQUEST);
        }

        if ($file->getClientOriginalExtension() !== 'csv') {
            return $this->json(['error' => 'File must be a CSV'], Response::HTTP_BAD_REQUEST);
        }

        $handle = fopen($file->getPathname(), 'r');
        if (!$handle) {
            return $this->json(['error' => 'Could not open file'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $headers = fgetcsv($handle);
        $imported = 0;
        $errors = [];

        while (($row = fgetcsv($handle)) !== false) {
            try {
                $rowData = array_combine($headers, $row);

                if (!isset($rowData['timestamp'], $rowData['category'], $rowData['value'])) {
                    $errors[] = "Row " . ($imported + 1) . ": Missing required fields";
                    continue;
                }

                $dataPoint = new DataPoint();
                $dataPoint->setUser($user);
                $dataPoint->setTimestamp(new \DateTime($rowData['timestamp']));
                $dataPoint->setCategory($rowData['category']);
                $dataPoint->setValue((float) $rowData['value']);

                if (isset($rowData['unit'])) {
                    $dataPoint->setUnit($rowData['unit']);
                }

                if (isset($rowData['notes'])) {
                    $dataPoint->setNotes($rowData['notes']);
                }

                $this->entityManager->persist($dataPoint);
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row " . ($imported + 1) . ": " . $e->getMessage();
            }
        }

        fclose($handle);
        $this->entityManager->flush();

        return $this->json([
            'message' => 'CSV import completed',
            'imported' => $imported,
            'errors' => $errors,
        ]);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $dataPoint = $this->entityManager->getRepository(DataPoint::class)->find($id);

        if (!$dataPoint) {
            return $this->json(['error' => 'Data point not found'], Response::HTTP_NOT_FOUND);
        }

        if ($dataPoint->getUser() !== $user) {
            return $this->json(['error' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $this->entityManager->remove($dataPoint);
        $this->entityManager->flush();

        return $this->json(['message' => 'Data point deleted successfully']);
    }
}

